import mongoose from 'mongoose';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { Attendance } from './attendance.model';
import { QRSession } from './qrSession.model';
import { Member } from '../member/member.model';
import { Branch } from '../gym/branch.model';
import { GamificationService } from '../gamification/gamification.service';
import { IAttendance, AttendanceStatus, AttendanceStats } from './attendance.types';
import { MembershipStatus } from '../member/member.types';
import { AppError } from '../../common/utils/AppError';
import { calculateDistanceMeters } from '../../common/utils/geo';
import { getDayKeyForBranch } from '../../common/utils/timezone';
import { verifyQRPayload } from '../../common/utils/qrCode';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { logger } from '../../config/logger';

export interface CheckInInput {
  qrToken?: string;
  qrPayload?: string;
  dynamicQrToken?: string;
  memberId?: string;
  branchId?: string;
  lat?: number;
  lng?: number;
}

export interface CheckOutInput {
  qrPayload?: string;
  attendanceId?: string;
  memberId?: string;
}

export interface ManualAttendanceInput {
  memberId: string;
  checkInAt: Date;
  checkOutAt?: Date;
  reason: string;
}

export class AttendanceService {
  /**
   * Scan QR / Check-In workflow
   */
  public static async checkIn(input: CheckInInput): Promise<IAttendance> {
    let resolvedMemberId: string | undefined = input.memberId;

    // 1. Validate Dynamic QR Token if provided (Single-use consumption)
    const tokenToValidate = input.qrToken || input.dynamicQrToken;
    if (tokenToValidate) {
      const qrSession = await QRSession.findOne({
        qrToken: tokenToValidate,
        isConsumed: false,
        expiresAt: { $gt: new Date() },
      });

      if (!qrSession) {
        throw AppError.badRequest(
          'Invalid or expired dynamic QR code token. Please scan the newly displayed QR code on the kiosk.'
        );
      }

      // Mark single-use token as consumed immediately
      qrSession.isConsumed = true;
      if (resolvedMemberId && mongoose.Types.ObjectId.isValid(resolvedMemberId)) {
        qrSession.consumedByMemberId = new mongoose.Types.ObjectId(resolvedMemberId);
      }
      await qrSession.save();
    }

    // 2. Decode Static Member QR Payload if provided
    if (input.qrPayload) {
      try {
        const decoded = verifyQRPayload(input.qrPayload);
        resolvedMemberId = decoded.memberId;
      } catch (error) {
        throw AppError.badRequest('Invalid or expired check-in QR code payload');
      }
    }

    if (!resolvedMemberId) {
      throw AppError.badRequest('Member ID or valid QR payload is required for check-in');
    }

    // 3. Fetch Member profile
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(resolvedMemberId) ? resolvedMemberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(resolvedMemberId) ? resolvedMemberId : undefined },
      ],
      isDeleted: false,
    });

    if (!member) {
      throw AppError.notFound('Member profile not found for check-in');
    }

    // 4. Validate Membership Status
    if (member.membershipStatus === MembershipStatus.FROZEN) {
      throw AppError.forbidden('Check-in rejected: Member account is currently FROZEN');
    }
    if (member.membershipStatus === MembershipStatus.EXPIRED) {
      throw AppError.forbidden('Check-in rejected: Membership has EXPIRED. Please renew membership.');
    }
    if (member.membershipStatus === MembershipStatus.CANCELLED) {
      throw AppError.forbidden('Check-in rejected: Membership is CANCELLED.');
    }

    // 5. Fetch Branch & GPS Verification Check
    const branchId = input.branchId || member.branchId.toString();
    const branch = await Branch.findOne({ _id: branchId, isDeleted: false });
    const timezone = branch?.timezone || 'UTC';

    if (branch?.gpsVerificationEnabled) {
      if (input.lat == null || input.lng == null) {
        throw AppError.badRequest('GPS coordinates (lat, lng) are required for check-in at this branch');
      }
      if (branch.location?.lat != null && branch.location?.lng != null) {
        const distance = calculateDistanceMeters(input.lat, input.lng, branch.location.lat, branch.location.lng);
        const radiusLimit = branch.location.radiusMeters || 150; // default 150m fallback
        if (distance > radiusLimit) {
          throw AppError.badRequest(
            `You must be at the gym location to check in (Current Distance: ${distance}m, Max allowed radius: ${radiusLimit}m)`
          );
        }
      }
    }

    const now = new Date();
    const currentDayKey = getDayKeyForBranch(now, timezone);

    // 5. Check for active open session
    const existingSession = await Attendance.findOne({
      memberId: member._id,
      status: AttendanceStatus.CHECKED_IN,
    });

    if (existingSession) {
      // Reactive auto-close if session is from a previous day
      if (existingSession.dayKey !== currentDayKey) {
        logger.info(`⏰ Reactive Auto-closing previous day open session for Member ID: ${member._id}`);
        existingSession.status = AttendanceStatus.AUTO_CLOSED;
        existingSession.checkOutAt = now;
        existingSession.durationMinutes = 240; // 4 hour cap
        existingSession.checkOutSource = 'SYSTEM';
        existingSession.isAnomalous = true;
        await existingSession.save();
      } else {
        throw AppError.conflict('Member is already checked in for an active workout session today');
      }
    }

    // 6. Create Attendance Record
    try {
      const attendance = new Attendance({
        gymId: member.gymId,
        branchId: member.branchId,
        memberId: member._id,
        checkInAt: now,
        status: AttendanceStatus.CHECKED_IN,
        checkInSource: input.qrPayload ? 'QR' : 'MANUAL',
        dayKey: currentDayKey,
      });

      await attendance.save();

      // Hook: Gamification streak & XP trigger
      await GamificationService.recordCheckInForStreak(member._id.toString(), member.gymId.toString());

      logger.info(`✅ Member Checked-In: [Member: ${member._id}] [Branch: ${branchId}] [DayKey: ${currentDayKey}]`);
      return attendance;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: number }).code === 11000) {
        throw AppError.conflict('Member already has an open checked-in session');
      }
      throw error;
    }
  }

  /**
   * Check-Out workflow
   */
  public static async checkOut(input: CheckOutInput): Promise<IAttendance> {
    let memberId: string | undefined = input.memberId;

    if (input.qrPayload) {
      try {
        const decoded = verifyQRPayload(input.qrPayload);
        memberId = decoded.memberId;
      } catch (error) {
        throw AppError.badRequest('Invalid QR code payload');
      }
    }

    let query: Record<string, unknown> | null = null;

    if (input.attendanceId) {
      query = { _id: input.attendanceId, status: AttendanceStatus.CHECKED_IN };
    } else if (memberId) {
      const member = await Member.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
          { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        ],
      });
      if (member) {
        query = { memberId: member._id, status: AttendanceStatus.CHECKED_IN };
      }
    }

    if (!query) {
      throw AppError.notFound('No active checked-in session found for checkout');
    }

    const session = await Attendance.findOne(query);

    if (!session) {
      throw AppError.notFound('No active checked-in session found for checkout');
    }

    const checkOutAt = new Date();
    const durationMs = checkOutAt.getTime() - session.checkInAt.getTime();
    const rawMinutes = Math.round(durationMs / (60 * 1000));

    // Sanity clamping (> 12 hours = anomalous)
    if (rawMinutes > 720) {
      session.durationMinutes = 240; // 4 hour cap
      session.isAnomalous = true;
      session.status = AttendanceStatus.AUTO_CLOSED;
      session.checkOutSource = 'SYSTEM';
    } else {
      session.durationMinutes = Math.max(1, rawMinutes);
      session.status = AttendanceStatus.CHECKED_OUT;
      session.checkOutSource = input.qrPayload ? 'QR' : 'MANUAL';
    }

    session.checkOutAt = checkOutAt;
    await session.save();

    logger.info(`🏁 Member Checked-Out: [Member: ${session.memberId}] [Duration: ${session.durationMinutes}m]`);
    return session;
  }

  /**
   * Staff Manual Attendance Entry / Override
   */
  public static async manualCheckInOut(input: ManualAttendanceInput): Promise<IAttendance> {
    const member = await Member.findOne({ _id: input.memberId, isDeleted: false });
    if (!member) {
      throw AppError.notFound('Member not found');
    }

    const branch = await Branch.findOne({ _id: member.branchId, isDeleted: false });
    const timezone = branch?.timezone || 'UTC';
    const dayKey = getDayKeyForBranch(input.checkInAt, timezone);

    let durationMinutes: number | undefined = undefined;
    let status = AttendanceStatus.CHECKED_IN;

    if (input.checkOutAt) {
      const durationMs = input.checkOutAt.getTime() - input.checkInAt.getTime();
      durationMinutes = Math.max(1, Math.round(durationMs / (60 * 1000)));
      status = AttendanceStatus.CHECKED_OUT;
    }

    const attendance = new Attendance({
      gymId: member.gymId,
      branchId: member.branchId,
      memberId: member._id,
      checkInAt: input.checkInAt,
      checkOutAt: input.checkOutAt,
      durationMinutes,
      status,
      checkInSource: 'MANUAL',
      checkOutSource: input.checkOutAt ? 'MANUAL' : undefined,
      dayKey,
      manualAuditReason: input.reason,
    });

    await attendance.save();
    return attendance;
  }

  /**
   * Get currently active session for a member
   */
  public static async getCurrentSession(memberId: string): Promise<IAttendance | null> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
    });

    if (!member) return null;

    return Attendance.findOne({
      memberId: member._id,
      status: AttendanceStatus.CHECKED_IN,
    });
  }

  /**
   * List member attendance history with pagination
   */
  public static async getAttendanceHistory(
    memberId: string,
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ attendanceList: IAttendance[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);

    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
    });

    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    const filter = { memberId: member._id };

    const [attendanceList, totalItems] = await Promise.all([
      Attendance.find(filter).skip(skip).limit(limit).sort({ checkInAt: -1 }),
      Attendance.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { attendanceList, meta };
  }

  /**
   * Daily Branch Attendance Log (for Staff / Dashboard)
   */
  public static async getBranchDailyAttendance(
    branchId: string,
    dayKey: string
  ): Promise<IAttendance[]> {
    return Attendance.find({
      branchId: new mongoose.Types.ObjectId(branchId),
      dayKey,
    })
      .populate({
        path: 'memberId',
        populate: { path: 'userId', select: 'fullName email phone avatarUrl' },
      })
      .sort({ checkInAt: -1 });
  }

  /**
   * Aggregate Member Attendance Analytics & Statistics (Feeds AI Coach Module 09)
   */
  public static async getAttendanceStats(memberId: string): Promise<AttendanceStats> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
    });

    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    const records = await Attendance.find({
      memberId: member._id,
      status: { $in: [AttendanceStatus.CHECKED_OUT, AttendanceStatus.AUTO_CLOSED] },
    });

    const totalVisits = records.length;
    let totalWorkoutMinutes = 0;
    const dayOfWeekDistribution: Record<string, number> = {
      Sunday: 0,
      Monday: 0,
      Tuesday: 0,
      Wednesday: 0,
      Thursday: 0,
      Friday: 0,
      Saturday: 0,
    };

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (const record of records) {
      totalWorkoutMinutes += record.durationMinutes || 0;
      const dayName = days[record.checkInAt.getUTCDay()];
      dayOfWeekDistribution[dayName] = (dayOfWeekDistribution[dayName] || 0) + 1;
    }

    const averageSessionMinutes = totalVisits > 0 ? Math.round(totalWorkoutMinutes / totalVisits) : 0;

    return {
      totalVisits,
      totalWorkoutMinutes,
      averageSessionMinutes,
      dayOfWeekDistribution,
    };
  }

  /**
   * Cron Routine: Force-close stale sessions older than N hours
   */
  public static async autoCloseStaleSessions(maxHours: number = 12): Promise<number> {
    const threshold = new Date(Date.now() - maxHours * 60 * 60 * 1000);

    const result = await Attendance.updateMany(
      {
        status: AttendanceStatus.CHECKED_IN,
        checkInAt: { $lt: threshold },
      },
      {
        status: AttendanceStatus.AUTO_CLOSED,
        checkOutAt: new Date(),
        durationMinutes: 240, // 4 hour cap
        checkOutSource: 'SYSTEM',
        isAnomalous: true,
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`⏰ Auto-closed ${result.modifiedCount} stale attendance session(s)`);
    }

    return result.modifiedCount;
  }

  /**
   * Generate Short-Lived Dynamic QR Code Token for Gym Reception/Kiosk Display
   */
  public static async generateDynamicQR(
    gymId: string,
    branchId: string,
    ttlSeconds: number = 60
  ): Promise<{ qrToken: string; qrCodeDataUrl: string; ttlSeconds: number; expiresAt: Date }> {
    const branch = await Branch.findOne({ _id: branchId, gymId, isDeleted: false });
    if (!branch) {
      throw AppError.notFound('Branch not found for generating dynamic QR');
    }

    const qrToken = `DYN_QR_${gymId}_${branchId}_${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await QRSession.create({
      gymId: branch.gymId,
      branchId: branch._id,
      qrToken,
      isConsumed: false,
      expiresAt,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrToken);

    return {
      qrToken,
      qrCodeDataUrl,
      ttlSeconds,
      expiresAt,
    };
  }
}
