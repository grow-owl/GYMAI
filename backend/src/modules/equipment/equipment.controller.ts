import { Request, Response, NextFunction } from 'express';
import { EquipmentService } from './equipment.service';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { assertTenantMatch } from '../../common/middlewares/tenant.middleware';
import { EquipmentStatus } from './equipment.types';

export class EquipmentController {
  public static async createEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gymId, branchId } = req.params;
      assertTenantMatch(gymId, req);

      const equipment = await EquipmentService.createEquipment(gymId, branchId, req.body);
      sendSuccess(res, equipment, 'Equipment created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async listEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gymId, branchId } = req.params;
      assertTenantMatch(gymId, req);

      const { status, category, page, limit } = req.query;
      const result = await EquipmentService.listEquipment(
        gymId,
        branchId,
        { status: status as EquipmentStatus, category: category as string },
        { page: page as string, limit: limit as string }
      );

      sendSuccess(res, result.equipment, 'Equipment fetched successfully', 200, {
        pagination: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { equipmentId } = req.params;
      const gymId = req.tenant!.gymId;

      const equipment = await EquipmentService.updateEquipment(equipmentId, gymId!, req.body);
      sendSuccess(res, equipment, 'Equipment updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async softDeleteEquipment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { equipmentId } = req.params;
      const gymId = req.tenant!.gymId;

      await EquipmentService.softDeleteEquipment(equipmentId, gymId!);
      sendSuccess(res, null, 'Equipment deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async getMaintenanceDueEquipment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { gymId } = req.params;
      const { branchId } = req.query;
      assertTenantMatch(gymId, req);

      const equipment = await EquipmentService.getMaintenanceDueEquipment(
        gymId,
        branchId as string | undefined
      );
      sendSuccess(res, equipment, 'Maintenance due equipment fetched successfully', 200);
    } catch (error) {
      next(error);
    }
  }
}
