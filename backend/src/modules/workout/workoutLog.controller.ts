import { Request, Response } from 'express';
import { WorkoutLogService } from './workoutLog.service';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { validateMemberAccess } from '../../common/utils/authorization';
import { Role } from '../../common/constants/roles.enum';

export class WorkoutLogController {
  public static startWorkoutLog = asyncHandler(async (req: Request, res: Response) => {
    const requestedMemberId = req.body.memberId || (req.user!.role === Role.MEMBER ? req.user!.id : undefined);
    const validatedMember = await validateMemberAccess(req.user!, requestedMemberId);
    const log = await WorkoutLogService.startWorkoutLog(validatedMember._id.toString(), req.body);
    return sendSuccess(res, { log }, 'Workout log started successfully', 201);
  });

  public static logSetProgress = asyncHandler(async (req: Request, res: Response) => {
    const { logId, exerciseId, setNumber } = req.params;
    const gymId = req.user?.gymId?.toString();
    const log = await WorkoutLogService.logSetProgress(
      logId,
      {
        exerciseId,
        setNumber: parseInt(setNumber, 10),
        reps: req.body.reps,
        weightKg: req.body.weightKg,
        completed: req.body.completed,
      },
      gymId,
      req.user!
    );
    return sendSuccess(res, { log }, 'Set progress updated successfully');
  });

  public static markExerciseComplete = asyncHandler(async (req: Request, res: Response) => {
    const { logId, exerciseId } = req.params;
    const gymId = req.user?.gymId?.toString();
    const log = await WorkoutLogService.markExerciseComplete(logId, exerciseId, gymId, req.user!);
    return sendSuccess(res, { log }, 'Exercise marked completed');
  });

  public static completeWorkoutLog = asyncHandler(async (req: Request, res: Response) => {
    const gymId = req.user?.gymId?.toString();
    const log = await WorkoutLogService.completeWorkoutLog(req.params.logId, gymId, req.user!);
    return sendSuccess(res, { log }, 'Workout session completed successfully');
  });

  public static getWorkoutHistory = asyncHandler(async (req: Request, res: Response) => {
    const requestedMemberId = req.params.memberId || (req.user!.role === Role.MEMBER ? req.user!.id : undefined);
    const validatedMember = await validateMemberAccess(req.user!, requestedMemberId);
    const { logs, meta } = await WorkoutLogService.getWorkoutHistory(validatedMember._id.toString(), req.query);
    return sendSuccess(res, { logs }, 'Workout history retrieved successfully', 200, {
      pagination: meta,
    });
  });

  public static getWorkoutCompletionStats = asyncHandler(async (req: Request, res: Response) => {
    const requestedMemberId = req.params.memberId || (req.user!.role === Role.MEMBER ? req.user!.id : undefined);
    const validatedMember = await validateMemberAccess(req.user!, requestedMemberId);
    const stats = await WorkoutLogService.getWorkoutCompletionStats(validatedMember._id.toString());
    return sendSuccess(res, { stats }, 'Workout completion statistics retrieved successfully');
  });
}
