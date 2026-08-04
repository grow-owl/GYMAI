import { Router } from 'express';
import { ReportController } from './report.controller';
import { generateReportSchema } from './report.validation';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/authorize.middleware';
import { injectTenantScope } from '../../common/middlewares/tenant.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { Role } from '../../common/constants/roles.enum';

const reportRouter = Router({ mergeParams: true });

reportRouter.use(authenticate);
reportRouter.use(injectTenantScope);

// GET /api/v1/gyms/:gymId/dashboard/overview
reportRouter.get(
  '/dashboard/overview',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  ReportController.getOverview
);

// GET /api/v1/gyms/:gymId/dashboard/expiring-memberships
reportRouter.get(
  '/dashboard/expiring-memberships',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  ReportController.getExpiringMemberships
);

// POST /api/v1/gyms/:gymId/reports
reportRouter.post(
  '/reports',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN),
  validate(generateReportSchema),
  ReportController.requestReport
);

// GET /api/v1/gyms/:gymId/reports/:reportRequestId
reportRouter.get(
  '/reports/:reportRequestId',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.TRAINER, Role.SUPER_ADMIN),
  ReportController.getReportById
);

// GET /api/v1/gyms/:gymId/analytics/branch-comparison
reportRouter.get(
  '/analytics/branch-comparison',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  ReportController.getBranchComparison
);

// GET /api/v1/gyms/:gymId/reports
reportRouter.get(
  '/reports',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN),
  ReportController.listReports
);

export default reportRouter;
