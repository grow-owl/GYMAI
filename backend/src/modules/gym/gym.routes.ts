import { Router } from 'express';
import { GymController } from './gym.controller';
import { PlatformBillingController } from '../payment/platformBilling.controller';
import { NotificationController } from '../notification/notification.controller';
import { recordManualPlatformPaymentSchema } from '../payment/payment.validation';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/authorize.middleware';
import { injectTenantScope } from '../../common/middlewares/tenant.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { Role } from '../../common/constants/roles.enum';
import {
  createGymSchema,
  updateGymSchema,
  updateGymPlanSchema,
  createBranchSchema,
  updateBranchSchema,
  assignManagerSchema,
} from './gym.validation';

const router = Router();

// Apply Authentication and Tenant Scoping on all Gym Routes
router.use(authenticate);
router.use(injectTenantScope);

// Gym Routes
router.post(
  '/',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  validate(createGymSchema, 'body'),
  GymController.createGym
);

router.get(
  '/:gymId',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER),
  GymController.getGymById
);

router.patch(
  '/:gymId',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  validate(updateGymSchema, 'body'),
  GymController.updateGym
);

router.delete(
  '/:gymId',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  GymController.softDeleteGym
);

router.patch(
  '/:gymId/plan',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  validate(updateGymPlanSchema, 'body'),
  GymController.updateGymPlan
);

router.get(
  '/:gymId/overview',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN, Role.BRANCH_MANAGER),
  GymController.getGymOverview
);

router.post(
  '/:gymId/manual-payment',
  authorize(Role.SUPER_ADMIN),
  validate(recordManualPlatformPaymentSchema, 'body'),
  PlatformBillingController.recordManualPlatformPayment
);

router.get(
  '/:gymId/whatsapp-log',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  NotificationController.getWhatsAppLog
);

// Branch Routes
router.post(
  '/:gymId/branches',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  validate(createBranchSchema, 'body'),
  GymController.createBranch
);

router.get(
  '/:gymId/branches',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER),
  GymController.listBranches
);

router.get(
  '/:gymId/branches/:branchId',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.TRAINER),
  GymController.getBranchById
);

router.patch(
  '/:gymId/branches/:branchId',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  validate(updateBranchSchema, 'body'),
  GymController.updateBranch
);

router.delete(
  '/:gymId/branches/:branchId',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  GymController.softDeleteBranch
);

router.patch(
  '/:gymId/branches/:branchId/manager',
  authorize(Role.GYM_OWNER, Role.SUPER_ADMIN),
  validate(assignManagerSchema, 'body'),
  GymController.assignBranchManager
);

export default router;
