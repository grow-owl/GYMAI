import mongoose from 'mongoose';
import { Member } from './member.model';
import { User } from '../user/user.model';
import { Gym } from '../gym/gym.model';
import { Branch } from '../gym/branch.model';
import { Trainer } from '../trainer/trainer.model';
import { Role } from '../../common/constants/roles.enum';
import { IMember, MembershipStatus } from './member.types';
import { AppError } from '../../common/utils/AppError';
import { generateQRPayload } from '../../common/utils/qrCode';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import { notificationTemplates } from '../notification/notificationTemplates';
import { WhatsAppNotificationService } from '../notification/whatsapp/whatsappNotification.service';
import { logger } from '../../config/logger';

export class MemberService {
  public static async createMember(
    gymId: string,
    branchId: string,
    memberData: {
      fullName: string;
      email: string;
      phone: string;
      password?: string;
      branchId?: string;
      planName: string;
      membershipStartDate: Date;
      membershipEndDate: Date;
      dateOfBirth?: Date;
      referralCode?: string;
      referredByMemberId?: string;
      assignedTrainerId?: string;
      emergencyContact?: { name: string; phone: string; relation: string };
      healthInfo?: { currentWeight_kg?: number; targetWeight_kg?: number; medicalNotes?: string; injuries?: string[] };
      fitnessGoals?: string[];
    }
  ): Promise<IMember> {
    const targetBranchId = memberData.branchId || branchId;

    const existingUser = await User.findOne({ email: memberData.email.toLowerCase(), isDeleted: false });
    if (existingUser) {
      throw AppError.conflict('An active account with this email address already exists');
    }

    const gym = await Gym.findById(gymId);
    const branch = await Branch.findOne({ _id: targetBranchId, gymId, isActive: true, isDeleted: false });
    if (!branch) {
      throw AppError.notFound('Target Gym Branch not found or inactive');
    }

    const user = new User({
      fullName: memberData.fullName,
      email: memberData.email.toLowerCase(),
      phone: memberData.phone,
      password: memberData.password || 'Member@123',
      role: Role.MEMBER,
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: new mongoose.Types.ObjectId(targetBranchId),
      referredByMemberId: memberData.referredByMemberId
        ? new mongoose.Types.ObjectId(memberData.referredByMemberId)
        : undefined,
      isActive: true,
    });
    await user.save();

    const qrTokenResult = await generateQRPayload({ memberId: user._id.toString(), gymId, branchId: targetBranchId, type: 'CHECK_IN' });
    const qrCode = qrTokenResult.token;

    // Auto-generate unique referral code for member if absent
    const generatedReferralCode =
      memberData.referralCode || `REF-${user._id.toString().slice(-6).toUpperCase()}`;

    let referredByMemberId: mongoose.Types.ObjectId | undefined = user.referredByMemberId;

    // Auto-assign trainer if not specified (least loaded, with available capacity)
    let assignedTrainerId = memberData.assignedTrainerId
      ? new mongoose.Types.ObjectId(memberData.assignedTrainerId)
      : undefined;

    if (!assignedTrainerId) {
      const trainers = await Trainer.find({
        gymId: new mongoose.Types.ObjectId(gymId),
        branchId: new mongoose.Types.ObjectId(targetBranchId),
        isDeleted: false,
      });

      let leastLoaded: typeof trainers[0] | null = null;
      let minLoad = Infinity;

      for (const t of trainers) {
        const load = await Member.countDocuments({
          assignedTrainerId: t._id,
          membershipStatus: { $in: ['ACTIVE', 'FROZEN'] },
          isDeleted: false,
        });
        const cap = t.maxMemberCapacity || Infinity;
        if (load < cap && load < minLoad) {
          minLoad = load;
          leastLoaded = t;
        }
      }

      if (leastLoaded) {
        assignedTrainerId = leastLoaded._id;
      }
    }

    const member = new Member({
      userId: user._id,
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: new mongoose.Types.ObjectId(targetBranchId),
      assignedTrainerId,
      membershipStatus: MembershipStatus.ACTIVE,
      membershipStartDate: memberData.membershipStartDate,
      membershipEndDate: memberData.membershipEndDate,
      planName: memberData.planName,
      dateOfBirth: memberData.dateOfBirth,
      referralCode: generatedReferralCode,
      referredByMemberId,
      emergencyContact: memberData.emergencyContact,
      healthInfo: memberData.healthInfo,
      fitnessGoals: memberData.fitnessGoals || [],
      qrCode,
    });
    await member.save();

    logger.info(`🏋️ New Member onboarded: [ID: ${member._id}] [User: ${user._id}] [Gym: ${gymId}]`);

    // 1. Send WELCOME_NEW_MEMBER WhatsApp Notification
    await WhatsAppNotificationService.sendWhatsApp(
      member._id.toString(),
      gymId,
      NotificationType.WELCOME_NEW_MEMBER,
      [user.fullName, gym?.name || 'our Gym']
    );

    // 2. Notify trainer using NEW_MEMBER_ASSIGNED notification type
    if (assignedTrainerId) {
      const trainerDoc = await Trainer.findById(assignedTrainerId);
      if (trainerDoc) {
        const template = notificationTemplates[NotificationType.NEW_MEMBER_ASSIGNED](user.fullName);
        await NotificationService.sendToUser(
          trainerDoc.userId.toString(),
          gymId,
          NotificationType.NEW_MEMBER_ASSIGNED,
          template.title,
          template.body
        );
      }
    }

    return member;
  }

  public static async listMembers(
    gymId: string,
    branchIdOrFilters?: string | { status?: string; trainerId?: string; search?: string },
    filtersOrOptions?: any,
    optionsArg?: any
  ): Promise<{ members: IMember[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    let branchIdFilter: string | undefined;
    let filters: { status?: string; trainerId?: string; search?: string } = {};
    let options: { page?: number | string; limit?: number | string } = {};

    if (typeof branchIdOrFilters === 'string') {
      branchIdFilter = branchIdOrFilters;
      filters = filtersOrOptions || {};
      options = optionsArg || {};
    } else {
      filters = branchIdOrFilters || {};
      options = filtersOrOptions || {};
    }

    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);

    const filter: Record<string, unknown> = {
      gymId: new mongoose.Types.ObjectId(gymId),
      isDeleted: false,
    };

    if (branchIdFilter) filter.branchId = new mongoose.Types.ObjectId(branchIdFilter);
    if (filters.status) filter.membershipStatus = filters.status;
    if (filters.trainerId) filter.assignedTrainerId = new mongoose.Types.ObjectId(filters.trainerId);

    const [members, totalItems] = await Promise.all([
      Member.find(filter)
        .populate('userId', 'fullName email phone isActive')
        .populate('branchId', 'name')
        .populate({ path: 'assignedTrainerId', populate: { path: 'userId', select: 'fullName' } })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Member.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { members, meta };
  }

  public static async getMemberById(memberId: string, gymId?: string): Promise<IMember> {
    const filter: Record<string, unknown> = { _id: memberId, isDeleted: false };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);

    const member = await Member.findOne(filter)
      .populate('userId', 'fullName email phone isActive')
      .populate('branchId', 'name address')
      .populate({ path: 'assignedTrainerId', populate: { path: 'userId', select: 'fullName email phone' } });

    if (!member) throw AppError.notFound('Member profile not found');
    return member;
  }

  public static async getMemberByUserId(userId: string): Promise<IMember> {
    const member = await Member.findOne({ userId, isDeleted: false })
      .populate('userId', 'fullName email phone isActive')
      .populate('branchId', 'name');

    if (!member) throw AppError.notFound('Member profile not found for user');
    return member;
  }

  public static async updateMember(
    memberId: string,
    updateDataOrGymId: any,
    gymIdOrRole?: any
  ): Promise<IMember> {
    let updateData: Record<string, unknown>;
    let role: string | undefined;

    if (typeof updateDataOrGymId === 'object' && typeof gymIdOrRole === 'string') {
      // Called as updateMember(id, data, role)
      updateData = updateDataOrGymId;
      role = gymIdOrRole;
    } else if (typeof updateDataOrGymId === 'object') {
      updateData = updateDataOrGymId;
    } else {
      updateData = gymIdOrRole || {};
    }

    // Trainers cannot update billing-sensitive fields
    const BILLING_FIELDS = ['planName', 'membershipStatus', 'membershipStartDate', 'membershipEndDate'];
    if (role === Role.TRAINER) {
      for (const field of BILLING_FIELDS) {
        if (field in updateData) {
          throw AppError.forbidden('Trainers are not authorized to modify billing or membership status fields');
        }
      }
    }

    const member = await Member.findOneAndUpdate(
      { _id: memberId, isDeleted: false },
      updateData,
      { new: true, runValidators: true }
    );
    if (!member) throw AppError.notFound('Member profile not found');
    return member;
  }

  public static async assignTrainer(memberId: string, trainerId: string, gymId?: string): Promise<IMember> {
    const trainerFilter: Record<string, unknown> = { _id: trainerId, isDeleted: false };
    if (gymId) trainerFilter.gymId = new mongoose.Types.ObjectId(gymId);

    const trainer = await Trainer.findOne(trainerFilter);
    if (!trainer) throw AppError.notFound('Trainer profile not found in your gym');

    // Capacity check
    if (trainer.maxMemberCapacity) {
      const currentLoad = await Member.countDocuments({
        assignedTrainerId: trainer._id,
        membershipStatus: { $in: ['ACTIVE', 'FROZEN'] },
        isDeleted: false,
      });
      if (currentLoad >= trainer.maxMemberCapacity) {
        throw AppError.conflict(`Trainer has reached maximum member capacity (${trainer.maxMemberCapacity})`);
      }
    }

    const memberFilter: Record<string, unknown> = { _id: memberId, isDeleted: false };
    if (gymId) memberFilter.gymId = new mongoose.Types.ObjectId(gymId);

    const member = await Member.findOneAndUpdate(
      memberFilter,
      { assignedTrainerId: trainer._id },
      { new: true }
    );
    if (!member) throw AppError.notFound('Member profile not found');
    return member;
  }

  public static async freezeMembership(
    memberId: string,
    freezeUntilOrDays: Date | number,
    reason?: string,
    gymId?: string
  ): Promise<IMember> {
    const filter: Record<string, unknown> = { _id: memberId, isDeleted: false };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);

    const member = await Member.findOne(filter);
    if (!member) throw AppError.notFound('Member profile not found');

    const freezeUntil = freezeUntilOrDays instanceof Date ? freezeUntilOrDays : new Date(Date.now() + freezeUntilOrDays * 24 * 60 * 60 * 1000);

    member.membershipStatus = MembershipStatus.FROZEN;
    member.membershipEndDate = freezeUntil;
    if (reason) {
      member.freezeHistory.push({ from: new Date(), to: freezeUntil, reason, createdAt: new Date() });
    }
    await member.save();
    return member;
  }

  public static async renewMembership(
    memberId: string,
    newEndDateOrMonths?: Date | number,
    newPlanName?: string,
    gymId?: string
  ): Promise<IMember> {
    const filter: Record<string, unknown> = { _id: memberId, isDeleted: false };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);

    const member = await Member.findOne(filter);
    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    let targetEndDate: Date;
    if (newEndDateOrMonths instanceof Date) {
      targetEndDate = newEndDateOrMonths;
    } else {
      const months = typeof newEndDateOrMonths === 'number' ? newEndDateOrMonths : 1;
      const currentExpiry = new Date(member.membershipEndDate);
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      baseDate.setMonth(baseDate.getMonth() + months);
      targetEndDate = baseDate;
    }

    member.membershipEndDate = targetEndDate;
    member.membershipStatus = MembershipStatus.ACTIVE;
    if (newPlanName) {
      member.planName = newPlanName;
    }

    await member.save();
    logger.info(`🔄 Membership renewed: [Member: ${memberId}] [New Expiry: ${targetEndDate.toISOString()}]`);
    return member;
  }

  public static async regenerateQRCode(memberId: string, gymId?: string): Promise<{ qrCode: string; qrCodeToken: string }> {
    const filter: Record<string, unknown> = { _id: memberId, isDeleted: false };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);

    const member = await Member.findOne(filter);
    if (!member) throw AppError.notFound('Member profile not found');

    const qrTokenResult = await generateQRPayload({ memberId: member.userId.toString(), gymId: gymId || member.gymId.toString(), branchId: member.branchId.toString(), type: 'CHECK_IN' });
    const qrCode = qrTokenResult.token;

    member.qrCode = qrCode;
    await member.save();
    return { qrCodeToken: qrCode, qrCode };
  }

  public static async softDeleteMember(memberId: string, gymId?: string): Promise<void> {
    const filter: Record<string, unknown> = { _id: memberId, isDeleted: false };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);

    const member = await Member.findOne(filter);
    if (!member) throw AppError.notFound('Member profile not found');

    await Member.findByIdAndUpdate(member._id, { isDeleted: true });
    await User.findByIdAndUpdate(member.userId, { isDeleted: true, isActive: false });
  }

  public static async checkAndExpireMemberships(): Promise<number> {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const expiredMembers = await Member.find({
      membershipStatus: MembershipStatus.ACTIVE,
      membershipEndDate: { $lt: now },
      isDeleted: false,
    });

    let expiredCount = 0;
    for (const m of expiredMembers) {
      m.membershipStatus = MembershipStatus.EXPIRED;
      await m.save();
      expiredCount++;

      const template = notificationTemplates[NotificationType.MEMBERSHIP_EXPIRED]();
      await NotificationService.sendToUser(
        m.userId.toString(),
        m.gymId.toString(),
        NotificationType.MEMBERSHIP_EXPIRED,
        template.title,
        template.body
      );
    }

    const expiringSoonMembers = await Member.find({
      membershipStatus: MembershipStatus.ACTIVE,
      membershipEndDate: { $gte: now, $lte: threeDaysFromNow },
      isDeleted: false,
    });

    let expiringSoonCount = 0;
    for (const m of expiringSoonMembers) {
      expiringSoonCount++;
      const daysLeft = Math.ceil((m.membershipEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const template = notificationTemplates[NotificationType.MEMBERSHIP_EXPIRING](daysLeft);
      await NotificationService.sendToUser(
        m.userId.toString(),
        m.gymId.toString(),
        NotificationType.MEMBERSHIP_EXPIRING,
        template.title,
        template.body
      );
    }

    if (expiredCount > 0 || expiringSoonCount > 0) {
      logger.info(`🚨 Passive Member Expiry Evaluator: [Expired: ${expiredCount}] [Expiring Soon: ${expiringSoonCount}]`);
    }

    // Return number (expiredCount) for backward compat — test expects a number
    return expiredCount;
  }
}
