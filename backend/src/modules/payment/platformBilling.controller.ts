import { Request, Response } from 'express';
import { PlatformBillingService } from './platformBilling.service';
import { PlatformInvoice } from './platformInvoice.model';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { assertTenantMatch } from '../../common/middlewares/tenant.middleware';

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

  public static recordManualPlatformPayment = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.params.gymId;
    const recordedByUserId = req.user!.id;
    const invoice = await PlatformBillingService.recordManualPlatformPayment(gymId, recordedByUserId, req.body);
    return sendSuccess(res, { invoice }, 'Manual platform payment recorded successfully', 201);
  });

  public static getPlatformRevenueOverview = asyncHandler(async (_req: Request, res: Response) => {
    const overview = await PlatformBillingService.getPlatformRevenueOverview();
    return sendSuccess(res, overview, 'Platform revenue overview retrieved successfully');
  });

  public static getPlatformRevenueTrends = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;
    const trends = await PlatformBillingService.getPlatformRevenueTrends(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    return sendSuccess(res, { trends }, 'Platform revenue trends retrieved successfully');
  });

  public static createUpgradeRequest = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.params.gymId || req.user?.gymId;
    if (!gymId) {
      return res.status(400).json({ success: false, error: { message: 'Gym ID is required' } });
    }
    assertTenantMatch(gymId, req);

    const upgradeRequest = await PlatformBillingService.createUpgradeRequest(
      gymId.toString(),
      req.user!.id,
      req.body
    );

    return sendSuccess(res, { upgradeRequest }, 'Upgrade request submitted successfully', 201);
  });

  public static listUpgradeRequests = asyncHandler(async (_req: Request, res: Response) => {
    const upgradeRequests = await PlatformBillingService.listUpgradeRequests();
    return sendSuccess(res, { upgradeRequests }, 'Upgrade requests retrieved successfully');
  });
}
