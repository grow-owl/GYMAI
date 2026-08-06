import mongoose from 'mongoose';
import { MemberPayment } from './memberPayment.model';
import { Member } from '../member/member.model';
import { MemberService } from '../member/member.service';
import { generateGymInvoiceNumber } from './invoiceCounter.model';
import { getPaymentGateway } from './gateway/paymentGateway.factory';
import { IMemberPayment, RevenueSummary, PaymentPurpose, PaymentMethod } from './memberPayment.types';
import { PaymentStatus } from './platformSubscription.types';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import { notificationTemplates } from '../notification/notificationTemplates';
import { WhatsAppNotificationService } from '../notification/whatsapp/whatsappNotification.service';
import { logger } from '../../config/logger';

export class MemberPaymentService {
  public static async recordManualPayment(
    gymIdOrData: any,
    recordedByUserIdOrUser?: any,
    paymentDataArg?: any
  ): Promise<IMemberPayment> {
    let gymId: string;
    let branchId: string | undefined;
    let memberId: string;
    let amount: number;
    let paymentMethod: PaymentMethod;
    let purpose: PaymentPurpose;
    let description: string | undefined;
    let customerName: string | undefined;
    let recordedByUserId: string;
    let renewMembership: boolean = false;
    let renewMonths: number = 1;

    if (typeof gymIdOrData === 'object') {
      gymId = gymIdOrData.gymId;
      branchId = gymIdOrData.branchId;
      memberId = gymIdOrData.memberId;
      amount = gymIdOrData.amount;
      paymentMethod = gymIdOrData.method || gymIdOrData.paymentMethod || 'cash';
      purpose = gymIdOrData.purpose || gymIdOrData.category || 'membership_fee';
      description = gymIdOrData.notes || gymIdOrData.description;
      customerName = gymIdOrData.customerName;
      recordedByUserId = recordedByUserIdOrUser?.id || recordedByUserIdOrUser;
      renewMembership = gymIdOrData.triggerRenewal || gymIdOrData.renewMembership || false;
    } else {
      gymId = gymIdOrData;
      recordedByUserId = recordedByUserIdOrUser;
      memberId = paymentDataArg?.memberId;
      amount = paymentDataArg?.amount;
      paymentMethod = paymentDataArg?.paymentMethod || paymentDataArg?.method || 'cash';
      purpose = paymentDataArg?.category || paymentDataArg?.purpose || 'membership_fee';
      description = paymentDataArg?.description || paymentDataArg?.notes;
      customerName = paymentDataArg?.customerName;
      renewMembership = paymentDataArg?.renewMembership || paymentDataArg?.triggerRenewal || false;
      renewMonths = paymentDataArg?.renewMonths || 1;
    }

    let member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : undefined },
      ],
      gymId: mongoose.Types.ObjectId.isValid(gymId) ? new mongoose.Types.ObjectId(gymId) : undefined,
      isDeleted: false,
    });

    if (!member) {
      member = await Member.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : undefined },
          { userId: mongoose.Types.ObjectId.isValid(memberId) ? new mongoose.Types.ObjectId(memberId) : undefined },
        ],
        isDeleted: false,
      });
    }

    if (!member) {
      throw AppError.notFound('Member profile not found in your gym');
    }

    const invoiceNumber = await generateGymInvoiceNumber();
    const memFullName = (member as any)?.fullName;
    const resolvedCustomerName =
      customerName ||
      (memFullName && memFullName !== 'N/A' && memFullName !== 'Walk-in Customer' ? memFullName : 'Walk-in Customer');

    const payment = new MemberPayment({
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: branchId ? new mongoose.Types.ObjectId(branchId) : member.branchId,
      memberId: member._id,
      recordedByUserId: new mongoose.Types.ObjectId(recordedByUserId),
      invoiceNumber,
      amount,
      method: paymentMethod,
      purpose,
      customerName: resolvedCustomerName,
      notes: description,
      status: PaymentStatus.SUCCESS,
      paidAt: new Date(),
      relatedMembershipRenewal: renewMembership,
    });

    await payment.save();

    if (renewMembership) {
      const newEndDate = typeof gymIdOrData === 'object' ? gymIdOrData.newEndDate : undefined;
      if (newEndDate) {
        await MemberService.renewMembership(member._id.toString(), new Date(newEndDate), undefined, gymId);
      } else {
        await MemberService.renewMembership(member._id.toString(), renewMonths, undefined, gymId);
      }
    }

    const template = notificationTemplates[NotificationType.PAYMENT_SUCCESS](payment.amount, payment.invoiceNumber);
    await NotificationService.sendToUser(
      member.userId.toString(),
      gymId,
      NotificationType.PAYMENT_SUCCESS,
      template.title,
      template.body
    );

    await WhatsAppNotificationService.sendWhatsApp(
      member._id.toString(),
      gymId,
      NotificationType.PAYMENT_SUCCESS,
      [String(payment.amount), payment.invoiceNumber]
    );

    logger.info(`💵 Member Payment recorded: [Invoice: ${invoiceNumber}] [Amount: ₹${amount}] [Method: ${paymentMethod}]`);
    return payment;
  }

  public static async initiateOnlineMemberPayment(
    gymIdOrData: any,
    memberUserIdOrUser?: any,
    amountArg?: number,
    purposeArg?: string
  ): Promise<{ orderId: string; amount: number; currency: string; invoiceNumber: string }> {
    let gymId: string;
    let memberUserId: string;
    let amount: number;
    let purpose: string;

    if (typeof gymIdOrData === 'object') {
      gymId = gymIdOrData.gymId;
      amount = gymIdOrData.amount;
      purpose = gymIdOrData.purpose || 'membership_fee';
      memberUserId = memberUserIdOrUser?.id || gymIdOrData.memberId;
    } else {
      gymId = gymIdOrData;
      memberUserId = memberUserIdOrUser;
      amount = amountArg!;
      purpose = purposeArg || 'membership_fee';
    }

    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberUserId) ? memberUserId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberUserId) ? memberUserId : undefined },
      ],
      gymId,
      isDeleted: false,
    });

    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    const invoiceNumber = await generateGymInvoiceNumber();
    const gateway = getPaymentGateway();
    const gatewayOrder = await gateway.createOrder(amount, 'INR', invoiceNumber);

    await MemberPayment.create({
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: member.branchId,
      memberId: member._id,
      recordedByUserId: member.userId,
      invoiceNumber,
      amount,
      method: 'online',
      purpose,
      gatewayOrderId: gatewayOrder.orderId,
      status: PaymentStatus.PENDING,
    });

    logger.info(`💳 Online Member Payment initiated: [Invoice: ${invoiceNumber}] [Amount: ₹${amount}]`);

    return {
      orderId: gatewayOrder.orderId,
      amount,
      currency: gatewayOrder.currency,
      invoiceNumber,
    };
  }

  public static async handleMemberPaymentWebhook(
    payload: any,
    signature: string,
    _formattedPayload?: any
  ): Promise<boolean> {
    const gateway = getPaymentGateway();
    const isValid = gateway.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      throw AppError.badRequest('Invalid webhook signature');
    }

    const { orderId, paymentId, status, invoiceNumber } = gateway.parseWebhookPayload(payload);

    const payment = await MemberPayment.findOne({
      $or: [{ gatewayOrderId: orderId }, { invoiceNumber }],
    });

    if (!payment) return false;
    if (payment.status === PaymentStatus.SUCCESS) return true;

    const member = await Member.findById(payment.memberId);

    if (status === 'SUCCESS') {
      payment.status = PaymentStatus.SUCCESS;
      payment.gatewayPaymentId = paymentId || orderId;
      payment.paidAt = new Date();
      await payment.save();

      if (payment.purpose === 'membership_fee' && member) {
        await MemberService.renewMembership(member._id.toString(), 1);
      }

      if (member) {
        const template = notificationTemplates[NotificationType.PAYMENT_SUCCESS](payment.amount, payment.invoiceNumber);
        await NotificationService.sendToUser(
          member.userId.toString(),
          payment.gymId.toString(),
          NotificationType.PAYMENT_SUCCESS,
          template.title,
          template.body
        );

        await WhatsAppNotificationService.sendWhatsApp(
          member._id.toString(),
          payment.gymId.toString(),
          NotificationType.PAYMENT_SUCCESS,
          [String(payment.amount), payment.invoiceNumber]
        );
      }

      logger.info(`🎉 Member Online Payment completed: [Invoice: ${payment.invoiceNumber}]`);
    } else {
      payment.status = PaymentStatus.FAILED;
      await payment.save();

      if (member) {
        const template = notificationTemplates[NotificationType.PAYMENT_FAILED]('Online transaction failed.');
        await NotificationService.sendToUser(
          member.userId.toString(),
          payment.gymId.toString(),
          NotificationType.PAYMENT_FAILED,
          template.title,
          template.body
        );
      }
    }

    return true;
  }

  public static async listPayments(
    _gymId: string,
    filters: { memberId?: string; branchId?: string; status?: PaymentStatus; purpose?: PaymentPurpose } = {},
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ payments: IMemberPayment[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);

    const filter: Record<string, unknown> = {};
    if (mongoose.Types.ObjectId.isValid(_gymId)) {
      filter.gymId = new mongoose.Types.ObjectId(_gymId);
    }
    if (filters.branchId && mongoose.Types.ObjectId.isValid(filters.branchId)) {
      filter.branchId = new mongoose.Types.ObjectId(filters.branchId);
    }
    if (filters.memberId && mongoose.Types.ObjectId.isValid(filters.memberId)) {
      filter.memberId = new mongoose.Types.ObjectId(filters.memberId);
    }
    if (filters.status) filter.status = filters.status;
    if (filters.purpose) filter.purpose = filters.purpose;

    let [payments, totalItems] = await Promise.all([
      MemberPayment.find(filter)
        .populate({ path: 'memberId', populate: { path: 'userId', select: 'fullName email phone' } })
        .skip(skip)
        .limit(limit)
        .sort({ paidAt: -1, createdAt: -1 }),
      MemberPayment.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { payments, meta };
  }

  public static async getRevenueSummary(
    _gymId: string,
    branchIdOrRange?: string | { startDate?: Date; endDate?: Date; branchId?: string },
    groupByOrRange?: 'day' | 'month' | { startDate?: Date; endDate?: Date; branchId?: string },
    startDateArg?: Date,
    endDateArg?: Date
  ): Promise<RevenueSummary> {
    let groupBy: 'day' | 'month' = 'month';
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    const matchFilter: any = {
      status: PaymentStatus.SUCCESS,
    };

    if (mongoose.Types.ObjectId.isValid(_gymId)) {
      matchFilter.gymId = new mongoose.Types.ObjectId(_gymId);
    }

    if (typeof branchIdOrRange === 'object' && branchIdOrRange !== null) {
      startDate = (branchIdOrRange as any).startDate;
      endDate = (branchIdOrRange as any).endDate;
      const bId = (branchIdOrRange as any).branchId;
      if (bId && mongoose.Types.ObjectId.isValid(bId)) {
        matchFilter.branchId = new mongoose.Types.ObjectId(bId);
      }
      if (typeof groupByOrRange === 'string') groupBy = groupByOrRange as 'day' | 'month';
    } else {
      if (typeof branchIdOrRange === 'string' && mongoose.Types.ObjectId.isValid(branchIdOrRange)) {
        matchFilter.branchId = new mongoose.Types.ObjectId(branchIdOrRange);
      }
      if (typeof groupByOrRange === 'string') groupBy = groupByOrRange as 'day' | 'month';
      else if (typeof groupByOrRange === 'object' && groupByOrRange !== null) {
        startDate = (groupByOrRange as any).startDate;
        endDate = (groupByOrRange as any).endDate;
        const bId = (groupByOrRange as any).branchId;
        if (bId && mongoose.Types.ObjectId.isValid(bId)) {
          matchFilter.branchId = new mongoose.Types.ObjectId(bId);
        }
      }
      if (startDateArg) startDate = startDateArg;
      if (endDateArg) endDate = endDateArg;
    }

    if (startDate || endDate) {
      matchFilter.paidAt = {};
      if (startDate) matchFilter.paidAt.$gte = startDate;
      if (endDate) matchFilter.paidAt.$lte = endDate;
    }

    const dateFormat = groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m';

    const [breakdown, totalAgg] = await Promise.all([
      MemberPayment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: '$paidAt' } },
            totalRevenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        {
          $project: {
            date: '$_id',
            totalRevenue: 1,
            count: 1,
            _id: 0,
          },
        },
      ]),
      MemberPayment.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      totalRevenue: totalAgg[0]?.totalRevenue || 0,
      totalTransactions: totalAgg[0]?.totalTransactions || 0,
      breakdown,
    };
  }

  public static async refundPayment(
    gymIdOrPaymentId: string,
    paymentIdOrReason: string,
    reasonOrAmount?: any
  ): Promise<IMemberPayment> {
    let paymentId: string;
    let reason: string;

    if (mongoose.Types.ObjectId.isValid(gymIdOrPaymentId) && mongoose.Types.ObjectId.isValid(paymentIdOrReason)) {
      paymentId = paymentIdOrReason;
      reason = typeof reasonOrAmount === 'string' ? reasonOrAmount : 'Owner requested refund';
    } else {
      paymentId = gymIdOrPaymentId;
      reason = paymentIdOrReason;
    }

    const payment = await MemberPayment.findOne({
      _id: paymentId,
      status: PaymentStatus.SUCCESS,
    });

    if (!payment) {
      throw AppError.notFound('Eligible successful payment transaction not found for refund');
    }

    payment.status = PaymentStatus.REFUNDED;
    payment.refundReason = reason;
    payment.refundedAt = new Date();
    payment.refundedAmount = payment.amount;
    await payment.save();

    logger.info(`💸 Payment refunded: [ID: ${payment._id}] [Amount: ₹${payment.amount}] [Reason: ${reason}]`);
    return payment;
  }
}
