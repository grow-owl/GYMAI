import { Router } from 'express';
import { MemberPaymentController } from './memberPayment.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/authorize.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { Role } from '../../common/constants/roles.enum';
import {
  recordMemberPaymentSchema,
  createMemberOnlineOrderSchema,
  refundPaymentSchema,
} from './payment.validation';

const gymMemberPaymentRouter = Router({ mergeParams: true });
const memberWebhookRouter = Router();

// Public Member Payment Webhook (No JWT Auth — Signature Verified)
memberWebhookRouter.post('/webhook', MemberPaymentController.handleMemberWebhook);

// Authenticated Routes under /api/v1/gyms/:gymId/payments
gymMemberPaymentRouter.use(authenticate);

gymMemberPaymentRouter.post(
  '/manual',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  validate(recordMemberPaymentSchema, 'body'),
  MemberPaymentController.recordManualPayment
);

gymMemberPaymentRouter.post(
  '/online-order',
  authorize(Role.MEMBER, Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  validate(createMemberOnlineOrderSchema, 'body'),
  MemberPaymentController.initiateOnlineOrder
);

gymMemberPaymentRouter.get(
  '/me',
  authorize(Role.MEMBER),
  MemberPaymentController.getMyPayments
);

gymMemberPaymentRouter.get(
  '/',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  MemberPaymentController.listPayments
);

gymMemberPaymentRouter.get(
  '/revenue-summary',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  MemberPaymentController.getRevenueSummary
);

gymMemberPaymentRouter.patch(
  '/:paymentId/refund',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  validate(refundPaymentSchema, 'body'),
  MemberPaymentController.refundPayment
);

export { gymMemberPaymentRouter, memberWebhookRouter };
