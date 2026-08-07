import mongoose from 'mongoose';
import { WorkoutLog } from './workoutLog.model';
import { WorkoutPlan } from './workoutPlan.model';
import { Member } from '../member/member.model';
import { Branch } from '../gym/branch.model';
import { GamificationService } from '../gamification/gamification.service';
import { IWorkoutLog, WorkoutCompletionStats } from './workoutLog.types';
import { AppError } from '../../common/utils/AppError';
import { getDayKeyForBranch } from '../../common/utils/timezone';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { logger } from '../../config/logger';

export interface StartWorkoutLogInput {
  workoutPlanId?: string;
  dayLabel?: string;
  attendanceId?: string;
  loggedAt?: string;
  exercises?: Array<{
    exerciseId?: string;
    exerciseName?: string;
    name?: string;
    sets?: number;
    reps?: number;
    weightKg?: number;
  }>;
}

export interface LogSetInput {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg?: number;
  completed?: boolean;
}

export class WorkoutLogService {
  /**
   * Start a Workout Logging Session (Pre-populates exercise structure from Plan or batch input)
   */
  public static async startWorkoutLog(
    memberId: string,
    input: StartWorkoutLogInput
  ): Promise<IWorkoutLog> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
      isDeleted: false,
    });

    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    const branch = await Branch.findOne({ _id: member.branchId, isDeleted: false });
    const timezone = branch?.timezone || 'UTC';
    const dayKey = getDayKeyForBranch(new Date(), timezone);

    const loggedExercises: { exerciseId: mongoose.Types.ObjectId; sets: Record<string, unknown>[] }[] = [];

    if (input.exercises && Array.isArray(input.exercises) && input.exercises.length > 0) {
      input.exercises.forEach((batchEx) => {
        const exId = (batchEx.exerciseId && mongoose.Types.ObjectId.isValid(batchEx.exerciseId))
          ? new mongoose.Types.ObjectId(batchEx.exerciseId)
          : new mongoose.Types.ObjectId();
        const setNum = Number(batchEx.sets) || 1;
        const reps = Number(batchEx.reps) || 10;
        const weightKg = Number(batchEx.weightKg) || 0;

        const setsArr = [];
        for (let i = 1; i <= setNum; i++) {
          setsArr.push({
            setNumber: i,
            reps,
            weightKg,
            completed: true,
          });
        }

        loggedExercises.push({
          exerciseId: exId,
          sets: setsArr,
        });
      });
    } else if (input.workoutPlanId) {
      // Pre-populate exercise structure if workoutPlanId and dayLabel are provided
      const plan = await WorkoutPlan.findOne({ _id: input.workoutPlanId, isDeleted: false });
      if (plan) {
        const targetDay = plan.days.find(
          (d) => (d.dayLabel ?? d.dayName ?? '').toLowerCase() === (input.dayLabel || '').toLowerCase()
        ) || plan.days[0];

        if (targetDay) {
          targetDay.exercises.forEach((ex) => {
            const initialSets = [];
            for (let i = 1; i <= ex.targetSets; i++) {
              initialSets.push({
                setNumber: i,
                reps: ex.targetReps,
                weightKg: ex.targetWeightKg,
                completed: false,
              });
            }
            loggedExercises.push({
              exerciseId: ex.exerciseId,
              sets: initialSets,
            });
          });
        }
      }
    }

    const isBatchCompleted = Boolean(input.exercises && input.exercises.length > 0);
    const log = new WorkoutLog({
      gymId: member.gymId,
      memberId: member._id,
      workoutPlanId: input.workoutPlanId ? new mongoose.Types.ObjectId(input.workoutPlanId) : undefined,
      attendanceId: input.attendanceId ? new mongoose.Types.ObjectId(input.attendanceId) : undefined,
      dayLabel: input.dayLabel || (isBatchCompleted ? 'Custom Session' : undefined),
      exercises: loggedExercises,
      startedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
      completedAt: isBatchCompleted ? (input.loggedAt ? new Date(input.loggedAt) : new Date()) : undefined,
      completed: isBatchCompleted,
      dayKey,
    });

    await log.save();

    if (isBatchCompleted) {
      try {
        await GamificationService.recordWorkoutCompletion(member._id.toString(), log._id.toString());
      } catch (err: any) {
        logger.warn(`Failed to update gamification for batch workout log: ${err.message}`);
      }
    }

    logger.info(`💪 Workout Log started: [LogID: ${log._id}] [Member: ${member._id}] [DayKey: ${dayKey}]`);
    return log;
  }


  /**
   * Log/Update set progress tap-by-tap (Atomic & Concurrency Safe)
   */
  public static async logSetProgress(
    workoutLogId: string,
    setData: LogSetInput,
    gymId?: string
  ): Promise<IWorkoutLog> {
    const filter: any = { _id: workoutLogId };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);
    const log = await WorkoutLog.findOne(filter);
    if (!log) {
      throw AppError.notFound('Workout log not found');
    }

    const exerciseObjectId = new mongoose.Types.ObjectId(setData.exerciseId);
    const targetExercise = log.exercises.find((ex) => ex.exerciseId.equals(exerciseObjectId));

    if (!targetExercise) {
      // Add exercise if doing freestyle/extra exercise
      log.exercises.push({
        exerciseId: exerciseObjectId,
        sets: [
          {
            setNumber: setData.setNumber,
            reps: setData.reps,
            weightKg: setData.weightKg,
            completed: setData.completed ?? true,
          },
        ],
      });
    } else {
      // Upsert set by setNumber
      const targetSet = targetExercise.sets.find((s) => s.setNumber === setData.setNumber);
      if (targetSet) {
        targetSet.reps = setData.reps;
        if (setData.weightKg !== undefined) targetSet.weightKg = setData.weightKg;
        targetSet.completed = setData.completed ?? true;
      } else {
        targetExercise.sets.push({
          setNumber: setData.setNumber,
          reps: setData.reps,
          weightKg: setData.weightKg,
          completed: setData.completed ?? true,
        });
      }
    }

    await log.save();
    return log;
  }

  /**
   * Mark individual exercise complete
   */
  public static async markExerciseComplete(
    workoutLogId: string,
    exerciseId: string,
    gymId?: string
  ): Promise<IWorkoutLog> {
    const filter: any = { _id: workoutLogId };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);
    const log = await WorkoutLog.findOne(filter);
    if (!log) {
      throw AppError.notFound('Workout log not found');
    }

    const exerciseObjectId = new mongoose.Types.ObjectId(exerciseId);
    const targetExercise = log.exercises.find((ex) => ex.exerciseId.equals(exerciseObjectId));

    if (!targetExercise) {
      throw AppError.notFound('Exercise not found in this workout log');
    }

    targetExercise.completedAt = new Date();
    await log.save();
    return log;
  }

  /**
   * Complete entire Workout Log
   */
  public static async completeWorkoutLog(workoutLogId: string, gymId?: string): Promise<IWorkoutLog> {
    const filter: any = { _id: workoutLogId };
    if (gymId) filter.gymId = new mongoose.Types.ObjectId(gymId);
    const log = await WorkoutLog.findOne(filter);
    if (!log) {
      throw AppError.notFound('Workout log not found');
    }

    const now = new Date();
    const durationMs = now.getTime() - log.startedAt.getTime();
    log.completedAt = now;
    log.totalDurationMinutes = Math.max(1, Math.round(durationMs / (60 * 1000)));

    await log.save();

    // Hook: Gamification workout completion trigger
    await GamificationService.recordWorkoutCompletion(log.memberId.toString(), log._id.toString());

    logger.info(`🏁 Workout Log completed: [LogID: ${log._id}] [Duration: ${log.totalDurationMinutes}m]`);
    return log;
  }

  /**
   * Get member workout log history with pagination
   */
  public static async getWorkoutHistory(
    memberId: string,
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ logs: IWorkoutLog[]; meta: ReturnType<typeof buildPaginationMeta> }> {
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

    const [logs, totalItems] = await Promise.all([
      WorkoutLog.find(filter)
        .populate('exercises.exerciseId', 'name muscleGroup equipment')
        .skip(skip)
        .limit(limit)
        .sort({ startedAt: -1 }),
      WorkoutLog.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { logs, meta };
  }

  /**
   * Aggregate Workout Completion Statistics (Feeds AI Coach Module 09)
   */
  public static async getWorkoutCompletionStats(memberId: string): Promise<WorkoutCompletionStats> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
    });

    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    const logs = await WorkoutLog.find({ memberId: member._id }).populate('exercises.exerciseId', 'name');

    const totalWorkoutSessions = logs.length;
    let totalPlannedExercises = 0;
    let totalCompletedExercises = 0;
    const skipCountMap: Record<string, { name: string; count: number }> = {};

    for (const log of logs) {
      for (const ex of log.exercises) {
        totalPlannedExercises++;
        if (ex.completedAt || ex.sets.some((s) => s.completed)) {
          totalCompletedExercises++;
        } else {
          const exIdStr = ex.exerciseId.toString();
          const name = (ex.exerciseId as unknown as { name?: string })?.name || 'Exercise';
          if (!skipCountMap[exIdStr]) {
            skipCountMap[exIdStr] = { name, count: 0 };
          }
          skipCountMap[exIdStr].count++;
        }
      }
    }

    const completionRatePercent =
      totalPlannedExercises > 0 ? Math.round((totalCompletedExercises / totalPlannedExercises) * 100) : 0;

    const mostSkippedExercises = Object.entries(skipCountMap)
      .map(([exerciseId, data]) => ({ exerciseId, name: data.name, skipCount: data.count }))
      .sort((a, b) => b.skipCount - a.skipCount)
      .slice(0, 5);

    return {
      totalWorkoutSessions,
      totalPlannedExercises,
      totalCompletedExercises,
      completionRatePercent,
      mostSkippedExercises,
    };
  }
}
