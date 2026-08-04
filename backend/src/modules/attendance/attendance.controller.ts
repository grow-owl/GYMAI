import { Request, Response } from 'express';
import { AttendanceService } from './attendance.service';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { getDayKeyForBranch } from '../../common/utils/timezone';

export class AttendanceController {
  public static checkIn = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.user?.role === 'MEMBER' ? req.user.id : req.body.memberId;
    const attendance = await AttendanceService.checkIn({
      qrPayload: req.body.qrPayload,
      dynamicQrToken: req.body.dynamicQrToken,
      memberId,
      branchId: req.body.branchId || req.user?.branchId,
      lat: req.body.lat,
      lng: req.body.lng,
    });
    return sendSuccess(res, { attendance }, 'Checked in successfully', 201);
  });

  public static checkOut = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.user?.role === 'MEMBER' ? req.user.id : req.body.memberId;
    const attendance = await AttendanceService.checkOut({
      qrPayload: req.body.qrPayload,
      attendanceId: req.body.attendanceId,
      memberId,
    });
    return sendSuccess(res, { attendance }, 'Checked out successfully', 200);
  });

  public static getCurrentSession = asyncHandler(async (req: Request, res: Response) => {
    const session = await AttendanceService.getCurrentSession(req.user!.id);
    return sendSuccess(res, { session }, 'Current active session retrieved successfully');
  });

  public static getMyHistory = asyncHandler(async (req: Request, res: Response) => {
    const { attendanceList, meta } = await AttendanceService.getAttendanceHistory(
      req.user!.id,
      req.query
    );
    return sendSuccess(res, { attendanceList }, 'Attendance history retrieved successfully', 200, {
      pagination: meta,
    });
  });

  public static getMyStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await AttendanceService.getAttendanceStats(req.user!.id);
    return sendSuccess(res, { stats }, 'Attendance analytics retrieved successfully');
  });

  public static manualCheckInOut = asyncHandler(async (req: Request, res: Response) => {
    const attendance = await AttendanceService.manualCheckInOut(req.body);
    return sendSuccess(res, { attendance }, 'Manual attendance entry recorded successfully', 201);
  });

  public static getBranchDailyAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { branchId } = req.params;
    const dayKey = (req.query.date as string) || getDayKeyForBranch(new Date(), 'UTC');

    const attendanceList = await AttendanceService.getBranchDailyAttendance(branchId, dayKey);
    return sendSuccess(res, { attendanceList, dayKey }, 'Daily branch attendance log retrieved successfully');
  });

  public static generateDynamicQR = asyncHandler(async (req: Request, res: Response) => {
    const { gymId, branchId } = req.params;
    const ttlSeconds = req.query.ttlSeconds ? parseInt(req.query.ttlSeconds as string, 10) : 60;
    const qrData = await AttendanceService.generateDynamicQR(gymId, branchId, ttlSeconds);
    return sendSuccess(res, qrData, 'Dynamic QR code generated successfully', 200);
  });
}
