import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { AppError } from '../utils/AppError';
import { Role } from '../constants/roles.enum';

/**
 * Middleware: Inject tenant scope into req.tenant based on req.user
 */
export const injectTenantScope = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required before tenant scoping'));
  }

  // Extract gymId and branchId from JWT payload or explicit headers/query
  const gymId =
    req.user.gymId ||
    (req.params?.gymId as string) ||
    (req.query?.gymId as string) ||
    (req.headers['x-gym-id'] as string);

  const branchId =
    req.user.branchId ||
    (req.params?.branchId as string) ||
    (req.query?.branchId as string) ||
    (req.headers['x-branch-id'] as string);

  req.tenant = {
    gymId,
    branchId,
  };

  next();
};

export const tenantScope = injectTenantScope;

/**
 * Helper function for service layer:
 * Verifies that a target resource's gymId matches the authenticated req.tenant.gymId
 * Prevents IDOR and cross-tenant data leakage.
 */
export const assertTenantMatch = (
  resourceGymId: string | Types.ObjectId | undefined | null,
  req: Request
): void => {
  // SUPER_ADMIN bypasses tenant check unless explicitly scoped
  if (req.user?.role === Role.SUPER_ADMIN) {
    return;
  }

  if (!resourceGymId || !req.tenant?.gymId) {
    throw AppError.forbidden('Tenant verification failed: Missing tenant identifier');
  }

  const resGymIdStr = resourceGymId.toString();
  const reqGymIdStr = req.tenant.gymId.toString();

  if (resGymIdStr !== reqGymIdStr) {
    throw AppError.forbidden('Access denied: Resource belongs to a different tenant organization');
  }
};
