import { Request, Response } from 'express';
import { PlatformBillingService } from './platformBilling.service';
import { PlatformInvoice } from './platformInvoice.model';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';

export class PlatformBillingController {
  public static initiatePlanUpgrade = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.user!.gymId;
    const ownerUserId = req.user!.id;
    if (!gymId) {
      return res.status(400).json({ success: false, error: { message: 'Gym ID is required' } });
    }

    const { newPlan, billingCycle } = req.body;
    const result = await PlatformBillingService.initiatePlanUpgrade(gymId.toString(), ownerUserId, newPlan, billingCycle);

    return sendSuccess(res, {
      order: { orderId: result.orderId, amount: result.amount, currency: result.currency },
      invoice: { invoiceNumber: result.invoiceNumber },
    }, 'Platform upgrade order initiated successfully', 201);
  });

  public static handlePlatformWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = (req.headers['x-razorpay-signature'] as string) || (req.headers['signature'] as string) || '';
    const rawBody = req.body;

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventData = payload.payload?.payment?.entity || payload.payload?.order?.entity || {};

    const formattedPayload = {
      event: payload.event || 'payment.captured',
      orderId: eventData.order_id || payload.orderId,
      paymentId: eventData.id || payload.paymentId,
      plan: eventData.notes?.newPlan || payload.plan,
      billingCycle: eventData.notes?.billingCycle || payload.billingCycle,
      failureReason: eventData.error_description || payload.failureReason,
    };

    const result = await PlatformBillingService.handlePlatformPaymentWebhook(
      rawBody,
      signature,
      formattedPayload
    );

    return sendSuccess(res, result, 'Platform webhook processed successfully');
  });

  public static getInvoices = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.user!.gymId;
    if (!gymId) {
      return res.status(400).json({ success: false, error: { message: 'Gym ID is required' } });
    }

    const invoices = await PlatformInvoice.find({ gymId }).sort({ createdAt: -1 });
    return sendSuccess(res, { invoices }, 'Platform invoices retrieved successfully');
  });
}
