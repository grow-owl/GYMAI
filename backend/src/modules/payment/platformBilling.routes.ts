import { Router } from 'express';
import { PlatformBillingController } from './platformBilling.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/authorize.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { Role } from '../../common/constants/roles.enum';
import { createPlatformOrderSchema, recordManualPlatformPaymentSchema } from './payment.validation';

const router = Router();

// Public Webhook (No JWT Auth — Cryptographic Signature Verified in Service)
router.post('/webhook', PlatformBillingController.handlePlatformWebhook);

// Authenticated Routes
router.use(authenticate);
router.post(
  '/upgrade',
  authorize(Role.GYM_OWNER),
  validate(createPlatformOrderSchema, 'body'),
  PlatformBillingController.initiatePlanUpgrade
);
router.get('/invoices', authorize(Role.GYM_OWNER, Role.SUPER_ADMIN), PlatformBillingController.getInvoices);

// Super Admin Manual Platform Payment & Revenue Analytics
router.post(
  '/gyms/:gymId/manual-payment',
  authorize(Role.SUPER_ADMIN),
  validate(recordManualPlatformPaymentSchema, 'body'),
  PlatformBillingController.recordManualPlatformPayment
);

router.get(
  '/analytics/overview',
  authorize(Role.SUPER_ADMIN),
  PlatformBillingController.getPlatformRevenueOverview
);

router.post(
  '/gyms/:gymId/upgrade-request',
  authorize(Role.GYM_OWNER),
  PlatformBillingController.createUpgradeRequest
);

router.get(
  '/upgrade-requests',
  authorize(Role.SUPER_ADMIN),
  PlatformBillingController.listUpgradeRequests
);

export default router;
