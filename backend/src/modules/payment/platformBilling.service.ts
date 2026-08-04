import { Gym } from '../gym/gym.model';
import { GymPlan, GymStatus } from '../gym/gym.types';
import { PlatformSubscription } from './platformSubscription.model';
import { PlatformInvoice } from './platformInvoice.model';
import { generatePlatformInvoiceNumber } from './invoiceCounter.model';
import { getPaymentGateway } from './gateway/paymentGateway.factory';
import { PLATFORM_PLAN_PRICING } from '../../common/constants/pricing';
import { BillingCycle, PaymentStatus } from './platformSubscription.types';
import { AppError } from '../../common/utils/AppError';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import { notificationTemplates } from '../notification/notificationTemplates';
import { logger } from '../../config/logger';

export class PlatformBillingService {
  public static async initiatePlanUpgrade(
    gymId: string,
    ownerUserId: string,
    targetPlan: GymPlan,
    billingCycle: BillingCycle = BillingCycle.MONTHLY
  ): Promise<{ orderId: string; amount: number; currency: string; invoiceNumber: string }> {
    const gym = await Gym.findOne({ _id: gymId, ownerId: ownerUserId, isDeleted: false });
    if (!gym) {
      throw AppError.notFound('Gym organization not found');
    }

    if (gym.plan === targetPlan && gym.status === GymStatus.ACTIVE) {
      throw AppError.badRequest(`Gym is already on the ${targetPlan} plan`);
    }

    const priceDetails = PLATFORM_PLAN_PRICING[targetPlan];
    if (!priceDetails) {
      throw AppError.badRequest('Invalid platform subscription plan selection');
    }

    const amount = billingCycle === BillingCycle.MONTHLY ? priceDetails.monthly : priceDetails.yearly;
    const gateway = getPaymentGateway();
    const invoiceNumber = await generatePlatformInvoiceNumber();

    const gatewayOrder = await gateway.createOrder(amount, 'INR', invoiceNumber);

    const now = new Date();
    const durationDays = billingCycle === BillingCycle.MONTHLY ? 30 : 365;
    const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    await PlatformInvoice.create({
      gymId: gym._id,
      invoiceNumber,
      amount,
      currency: 'INR',
      periodStart: now,
      periodEnd,
      gatewayOrderId: gatewayOrder.orderId,
      status: PaymentStatus.PENDING,
    });

    logger.info(`💳 Platform Upgrade initiated: [Gym: ${gymId}] [Plan: ${targetPlan}] [Invoice: ${invoiceNumber}]`);

    return {
      orderId: gatewayOrder.orderId,
      amount,
      currency: gatewayOrder.currency,
      invoiceNumber,
    };
  }

  public static async handlePlatformPaymentWebhook(
    payload: any,
    signature: string,
    _formattedPayload?: any
  ): Promise<{ success: boolean; gymId?: string }> {
    const gateway = getPaymentGateway();
    const isValid = gateway.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      throw AppError.badRequest('Invalid webhook signature');
    }

    const { orderId, paymentId, status, invoiceNumber } = gateway.parseWebhookPayload(payload);

    const invoice = await PlatformInvoice.findOne({
      $or: [{ gatewayOrderId: orderId }, { invoiceNumber }],
    });

    if (!invoice) {
      logger.warn(`⚠️ Webhook received for unknown platform invoice: ${orderId || invoiceNumber}`);
      return { success: false };
    }

    if (invoice.status === PaymentStatus.SUCCESS) {
      return { success: true, gymId: invoice.gymId.toString() };
    }

    const gym = await Gym.findById(invoice.gymId);

    if (status === 'SUCCESS') {
      invoice.status = PaymentStatus.SUCCESS;
      invoice.gatewayPaymentId = paymentId || orderId;
      invoice.paidAt = new Date();
      await invoice.save();

      if (gym) {
        const now = new Date();
        const durationDays = invoice.periodEnd.getTime() - invoice.periodStart.getTime();
        const expiresAt = new Date(now.getTime() + durationDays);

        gym.plan = GymPlan.PRO; // Upgrade plan
        gym.status = GymStatus.ACTIVE;
        gym.subscriptionExpiresAt = expiresAt;
        await gym.save();

        await PlatformSubscription.findOneAndUpdate(
          { gymId: gym._id },
          {
            plan: GymPlan.PRO,
            billingCycle: BillingCycle.MONTHLY,
            amount: invoice.amount,
            currency: 'INR',
            currentPeriodStart: now,
            currentPeriodEnd: expiresAt,
            autoRenew: true,
          },
          { upsert: true, new: true }
        );

        const template = notificationTemplates[NotificationType.PAYMENT_SUCCESS](invoice.amount, invoice.invoiceNumber);
        await NotificationService.sendToUser(
          gym.ownerId.toString(),
          gym._id.toString(),
          NotificationType.PAYMENT_SUCCESS,
          template.title,
          template.body
        );

        logger.info(`🎉 Platform Subscription active: [Gym: ${gym._id}] [Plan: ${gym.plan}]`);
      }
    } else {
      invoice.status = PaymentStatus.FAILED;
      await invoice.save();

      if (gym) {
        const template = notificationTemplates[NotificationType.PAYMENT_FAILED]('Transaction declined.');
        await NotificationService.sendToUser(
          gym.ownerId.toString(),
          gym._id.toString(),
          NotificationType.PAYMENT_FAILED,
          template.title,
          template.body
        );
      }
    }

    return { success: true, gymId: invoice.gymId.toString() };
  }

  public static async checkAndSuspendUnpaidGyms(): Promise<number> {
    const now = new Date();
    const expiredGyms = await Gym.find({
      status: GymStatus.ACTIVE,
      subscriptionExpiresAt: { $lt: now },
      isDeleted: false,
    });

    let count = 0;
    for (const gym of expiredGyms) {
      gym.status = GymStatus.SUSPENDED;
      await gym.save();
      count++;
    }

    if (count > 0) {
      logger.info(`🚨 Passive Gym Evaluator: Suspended ${count} unpaid gym(s) due to expired subscriptions`);
    }

    return count;
  }
}
