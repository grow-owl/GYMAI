import { Request, Response } from 'express';
import { MemberPaymentService } from './memberPayment.service';
import { MemberPayment } from './memberPayment.model';
import { Member } from '../member/member.model';
import { PaymentStatus } from './platformSubscription.types';
import { PaymentPurpose } from './memberPayment.types';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';

export class MemberPaymentController {
  public static recordManualPayment = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.params.gymId || req.user!.gymId;
    if (!gymId) {
      return res.status(400).json({ success: false, error: { message: 'Gym ID is required' } });
    }

    const payment = await MemberPaymentService.recordManualPayment(
      {
        gymId: gymId.toString(),
        branchId: req.body.branchId,
        memberId: req.body.memberId,
        amount: req.body.amount,
        purpose: req.body.purpose,
        method: req.body.method,
        notes: req.body.notes,
        triggerRenewal: req.body.triggerRenewal,
        newEndDate: req.body.newEndDate ? new Date(req.body.newEndDate) : undefined,
      },
      { id: req.user!.id, role: req.user!.role }
    );

    return sendSuccess(res, { payment }, 'Member payment recorded successfully', 201);
  });

  public static initiateOnlineOrder = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.params.gymId || req.user!.gymId;
    if (!gymId) {
      return res.status(400).json({ success: false, error: { message: 'Gym ID is required' } });
    }

    const result = await MemberPaymentService.initiateOnlineMemberPayment(
      {
        gymId: gymId.toString(),
        branchId: req.body.branchId,
        memberId: req.body.memberId,
        amount: req.body.amount,
        purpose: req.body.purpose,
        notes: req.body.notes,
      },
      { id: req.user!.id }
    );

    return sendSuccess(res, { order: result }, 'Online payment order initiated successfully', 201);
  });

  public static handleMemberWebhook = asyncHandler(async (req: Request, res: Response) => {
    const signature = (req.headers['x-razorpay-signature'] as string) || (req.headers['signature'] as string) || '';
    const rawBody = req.body;

    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventData = payload.payload?.payment?.entity || payload.payload?.order?.entity || {};

    const formattedPayload = {
      event: payload.event || 'payment.captured',
      orderId: eventData.order_id || payload.orderId,
      paymentId: eventData.id || payload.paymentId,
      failureReason: eventData.error_description || payload.failureReason,
    };

    const result = await MemberPaymentService.handleMemberPaymentWebhook(rawBody, signature, formattedPayload);
    return sendSuccess(res, result, 'Member payment webhook processed successfully');
  });

  public static listPayments = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.params.gymId || req.user!.gymId;
    if (!gymId) {
      return res.status(400).json({ success: false, error: { message: 'Gym ID is required' } });
    }

    const { branchId, memberId, status, purpose } = req.query;

    const { payments, meta } = await MemberPaymentService.listPayments(
      gymId.toString(),
      {
        branchId: branchId as string,
        memberId: memberId as string,
        status: status as PaymentStatus,
        purpose: purpose as PaymentPurpose,
      },
      req.query
    );

    return sendSuccess(res, { payments }, 'Member payments retrieved successfully', 200, {
      pagination: meta,
    });
  });

  public static getMyPayments = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.params.gymId || req.user!.gymId;
    if (!gymId) {
      return res.status(400).json({ success: false, error: { message: 'Gym ID is required' } });
    }

    const member = await Member.findOne({ userId: req.user!.id, gymId, isDeleted: false });
    if (!member) {
      return sendSuccess(res, { payments: [] }, 'Member payments retrieved successfully');
    }

    const payments = await MemberPayment.find({
      gymId,
      memberId: member._id,
    }).sort({ paidAt: -1, createdAt: -1 });

    return sendSuccess(res, { payments }, 'Member payments retrieved successfully');
  });

  public static getRevenueSummary = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.params.gymId || req.user!.gymId;
    if (!gymId) {
      return res.status(400).json({ success: false, error: { message: 'Gym ID is required' } });
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const groupBy = (req.query.groupBy as 'day' | 'month') || 'day';

    const revenue = await MemberPaymentService.getRevenueSummary(gymId.toString(), { startDate, endDate }, groupBy);

    return sendSuccess(res, { revenue: revenue.breakdown, summary: { total: revenue.totalRevenue, transactions: revenue.totalTransactions }, groupBy }, 'Revenue summary retrieved successfully');
  });

  public static refundPayment = asyncHandler(async (req: Request, res: Response) => {
    const { paymentId } = req.params;
    const { amount, reason } = req.body;

    const payment = await MemberPaymentService.refundPayment(paymentId, reason, amount);

    return sendSuccess(res, { payment }, 'Payment refunded successfully');
  });
}
