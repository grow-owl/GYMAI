import { Router } from 'express';
import { LeadController } from './lead.controller';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authorize } from '../../common/middlewares/authorize.middleware';
import { tenantScope } from '../../common/middlewares/tenant.middleware';
import { validate } from '../../common/middlewares/validate.middleware';
import { Role } from '../../common/constants/roles.enum';
import {
  createLeadSchema,
  updateLeadStatusSchema,
  addFollowUpNoteSchema,
  convertLeadSchema,
} from './lead.validation';

const router = Router();

router.use(authenticate);
router.use(tenantScope);

// Scoped under /gyms/:gymId/branches/:branchId/leads
router.post(
  '/gyms/:gymId/branches/:branchId/leads',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  validate(createLeadSchema, 'body'),
  LeadController.createLead
);

router.post(
  '/gyms/:gymId/leads',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  validate(createLeadSchema, 'body'),
  LeadController.createLead
);

router.get(
  '/gyms/:gymId/branches/:branchId/leads',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  LeadController.listLeads
);

router.get(
  '/gyms/:gymId/leads',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  LeadController.listLeads
);

// Direct lead ID endpoints
router.patch(
  '/leads/:leadId/status',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  validate(updateLeadStatusSchema, 'body'),
  LeadController.updateLeadStatus
);

router.post(
  '/leads/:leadId/notes',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  validate(addFollowUpNoteSchema, 'body'),
  LeadController.addFollowUpNote
);

router.post(
  '/leads/:leadId/convert',
  authorize(Role.GYM_OWNER, Role.BRANCH_MANAGER, Role.SUPER_ADMIN, Role.KIOSK),
  validate(convertLeadSchema, 'body'),
  LeadController.convertLeadToMember
);

export default router;
