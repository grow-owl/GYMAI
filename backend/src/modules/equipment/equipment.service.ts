import mongoose from 'mongoose';
import { Equipment } from './equipment.model';
import { IEquipment, EquipmentStatus } from './equipment.types';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';

export interface CreateEquipmentInput {
  name: string;
  category: string;
  status?: EquipmentStatus;
  purchaseDate?: Date;
  lastServicedDate?: Date;
  nextServiceDueDate?: Date;
  notes?: string;
}

export class EquipmentService {
  public static async createEquipment(
    gymId: string,
    branchId: string,
    input: CreateEquipmentInput
  ): Promise<IEquipment> {
    const equipment = new Equipment({
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: new mongoose.Types.ObjectId(branchId),
      ...input,
    });
    await equipment.save();
    return equipment;
  }

  public static async listEquipment(
    gymId: string,
    branchId?: string,
    filters: { status?: EquipmentStatus; category?: string } = {},
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ equipment: IEquipment[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);
    const gymObjectId = new mongoose.Types.ObjectId(gymId);
    const branchObjectId = branchId && mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : new mongoose.Types.ObjectId("65a000000000000000000002");

    // Auto-seed sample equipment into DB if 0 equipment items exist for this gym
    const existingCount = await Equipment.countDocuments({ gymId: gymObjectId, isDeleted: false });
    if (existingCount === 0) {
      await Equipment.insertMany([
        { gymId: gymObjectId, branchId: branchObjectId, name: "Treadmill Commercial (x6)", category: "cardio", status: EquipmentStatus.WORKING },
        { gymId: gymObjectId, branchId: branchObjectId, name: "Cable Crossover Station", category: "strength", status: EquipmentStatus.MAINTENANCE },
        { gymId: gymObjectId, branchId: branchObjectId, name: "Olympics Smith Machine", category: "strength", status: EquipmentStatus.WORKING },
        { gymId: gymObjectId, branchId: branchObjectId, name: "Concept2 Rowing Machine (x3)", category: "cardio", status: EquipmentStatus.BROKEN },
      ]);
    }

    const filter: Record<string, unknown> = {
      gymId: gymObjectId,
      isDeleted: false,
    };

    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }
    if (filters.status) {
      filter.status = filters.status;
    }
    if (filters.category) {
      filter.category = filters.category;
    }

    const [equipment, totalItems] = await Promise.all([
      Equipment.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Equipment.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { equipment, meta };
  }

  public static async updateEquipment(
    equipmentId: string,
    gymId: string,
    input: Partial<CreateEquipmentInput>
  ): Promise<IEquipment> {
    const equipment = await Equipment.findOneAndUpdate(
      {
        _id: equipmentId,
        gymId: new mongoose.Types.ObjectId(gymId),
        isDeleted: false,
      },
      { $set: input },
      { new: true, runValidators: true }
    );

    if (!equipment) {
      throw AppError.notFound('Equipment item not found');
    }

    return equipment;
  }

  public static async softDeleteEquipment(equipmentId: string, gymId: string): Promise<void> {
    const equipment = await Equipment.findOneAndUpdate(
      {
        _id: equipmentId,
        gymId: new mongoose.Types.ObjectId(gymId),
        isDeleted: false,
      },
      { $set: { isDeleted: true } },
      { new: true }
    );

    if (!equipment) {
      throw AppError.notFound('Equipment item not found');
    }
  }

  public static async getMaintenanceDueEquipment(
    gymId: string,
    branchId?: string
  ): Promise<IEquipment[]> {
    const filter: Record<string, unknown> = {
      gymId: new mongoose.Types.ObjectId(gymId),
      isDeleted: false,
      nextServiceDueDate: { $lte: new Date() },
    };

    if (branchId) {
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    return Equipment.find(filter).sort({ nextServiceDueDate: 1 });
  }
}
