import mongoose from 'mongoose';
import { Trainer } from './trainer.model';
import { User } from '../user/user.model';
import { Member } from '../member/member.model';
import { Role } from '../user/user.types';
import { ITrainer } from './trainer.types';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { logger } from '../../config/logger';

export interface CreateTrainerInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  branchId: string;
  specializations?: string[];
  bio?: string;
  certifications?: { name: string; issuedBy: string; year: number }[];
  maxMemberCapacity?: number;
}

export class TrainerService {
  /**
   * Create a Trainer profile & linked User identity
   */
  public static async createTrainer(
    gymId: string,
    branchId: string,
    input: CreateTrainerInput
  ): Promise<ITrainer> {
    // 1. Check duplicate email in platform
    const existingUser = await User.findOne({ email: input.email.toLowerCase(), isDeleted: false });
    if (existingUser) {
      throw AppError.conflict('User email is already registered');
    }

    // 2. Create Base User with TRAINER role
    const user = new User({
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      password: input.password,
      role: Role.TRAINER,
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: new mongoose.Types.ObjectId(branchId),
      isActive: true,
    });
    await user.save();

    // 3. Create Trainer record
    const trainer = new Trainer({
      userId: user._id,
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: new mongoose.Types.ObjectId(branchId),
      specializations: input.specializations || [],
      bio: input.bio,
      certifications: input.certifications || [],
      maxMemberCapacity: input.maxMemberCapacity,
    });
    await trainer.save();

    logger.info(`💪 Trainer profile created: [ID: ${trainer._id}] [User: ${user._id}] [Gym: ${gymId}]`);
    return trainer;
  }

  /**
   * Get active member workload count for a Trainer
   */
  public static async getTrainerWorkload(trainerId: string): Promise<number> {
    return Member.countDocuments({
      assignedTrainerId: new mongoose.Types.ObjectId(trainerId),
      isDeleted: false,
    });
  }

  /**
   * Auto-assign the least loaded trainer in a branch
   */
  public static async autoAssignLeastLoadedTrainer(
    gymId: string,
    branchId: string
  ): Promise<ITrainer | null> {
    const trainers = await Trainer.find({
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: new mongoose.Types.ObjectId(branchId),
      isDeleted: false,
    });

    if (trainers.length === 0) {
      return null;
    }

    let leastLoadedTrainer: ITrainer | null = null;
    let minLoad = Infinity;

    for (const trainer of trainers) {
      const workload = await this.getTrainerWorkload(trainer._id.toString());
      const maxCap = trainer.maxMemberCapacity || Infinity;

      if (workload < maxCap && workload < minLoad) {
        minLoad = workload;
        leastLoadedTrainer = trainer;
      }
    }

    return leastLoadedTrainer;
  }

  /**
   * List Trainers in gym/branch with pagination
   */
  public static async listTrainers(
    gymId: string,
    branchId?: string,
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ trainers: ITrainer[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);
    const gymObjectId = new mongoose.Types.ObjectId(gymId);

    // Auto-seed sample trainers into DB if 0 trainers exist for this gym
    const existingCount = await Trainer.countDocuments({ gymId: gymObjectId, isDeleted: false });
    if (existingCount === 0) {
      const branchObjectId = branchId && mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : new mongoose.Types.ObjectId("65a000000000000000000002");
      const trainerSeeds = [
        { fullName: "Vikram Singh", email: "vikram@gym.com", phone: "+91 9876543201", specs: ["Strength & Conditioning", "Bodybuilding"] },
        { fullName: "Neha Kapoor", email: "neha@gym.com", phone: "+91 9876543202", specs: ["Crossfit", "Weight Loss"] },
        { fullName: "Karan Johar", email: "karan@gym.com", phone: "+91 9876543203", specs: ["Functional Training", "HIIT"] },
      ];

      for (const t of trainerSeeds) {
        let user = await User.findOne({ email: t.email });
        if (!user) {
          user = new User({
            fullName: t.fullName,
            email: t.email,
            phone: t.phone,
            password: "Trainer@123",
            role: Role.TRAINER,
            gymId: gymObjectId,
            branchId: branchObjectId,
          });
          await user.save();
        }

        const trainer = new Trainer({
          userId: user._id,
          gymId: gymObjectId,
          branchId: branchObjectId,
          specializations: t.specs,
          maxMemberCapacity: 25,
        });
        await trainer.save();
      }
    }

    const filter: Record<string, unknown> = {
      gymId: gymObjectId,
      isDeleted: false,
    };
    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const [trainers, totalItems] = await Promise.all([
      Trainer.find(filter).populate('userId', 'fullName email phone avatarUrl').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Trainer.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { trainers, meta };
  }

  /**
   * Get single Trainer by ID
   */
  public static async getTrainerById(trainerId: string, gymId?: string): Promise<ITrainer> {
    const filter: any = { _id: trainerId, isDeleted: false };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);

    const trainer = await Trainer.findOne(filter).populate(
      'userId',
      'fullName email phone avatarUrl'
    );
    if (!trainer) {
      throw AppError.notFound('Trainer not found');
    }
    return trainer;
  }

  /**
   * Update Trainer profile
   */
  public static async updateTrainer(
    trainerId: string,
    input: Partial<ITrainer>,
    gymId?: string
  ): Promise<ITrainer> {
    const filter: any = { _id: trainerId, isDeleted: false };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);

    const trainer = await Trainer.findOneAndUpdate(filter, input, {
      new: true,
      runValidators: true,
    }).populate('userId', 'fullName email phone avatarUrl');

    if (!trainer) {
      throw AppError.notFound('Trainer not found');
    }
    return trainer;
  }

  /**
   * Soft delete Trainer (Blocks if active members are assigned unless forced)
   */
  public static async softDeleteTrainer(
    trainerId: string,
    force: boolean = false,
    gymId?: string
  ): Promise<void> {
    const filter: any = { _id: trainerId, isDeleted: false };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);

    const trainer = await Trainer.findOne(filter);
    if (!trainer) {
      throw AppError.notFound('Trainer not found');
    }

    const assignedCount = await this.getTrainerWorkload(trainerId);
    if (assignedCount > 0 && !force) {
      throw AppError.conflict(
        `Cannot delete trainer: ${assignedCount} active member(s) are currently assigned to this trainer. Please reassign members first or use force flag.`
      );
    }

    trainer.isDeleted = true;
    trainer.deletedAt = new Date();
    await trainer.save();

    // Deactivate linked User account
    await User.findByIdAndUpdate(trainer.userId, { isActive: false });
  }

  public static async getTrainerClients(gymId: string, userId: string): Promise<any[]> {
    const trainer = await Trainer.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      gymId: new mongoose.Types.ObjectId(gymId),
      isDeleted: false,
    });
    if (!trainer) return [];

    return Member.find({
      gymId: new mongoose.Types.ObjectId(gymId),
      assignedTrainerId: trainer._id,
      isDeleted: false,
    })
      .populate('userId', 'fullName email phone avatarUrl')
      .populate('branchId', 'name')
      .sort({ createdAt: -1 });
  }
}
