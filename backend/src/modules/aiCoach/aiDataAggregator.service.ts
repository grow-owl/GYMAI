import mongoose from 'mongoose';
import { Member } from '../member/member.model';
import { AttendanceService } from '../attendance/attendance.service';
import { WorkoutLogService } from '../workout/workoutLog.service';
import { ProgressService } from '../progress/progress.service';
import { AppError } from '../../common/utils/AppError';

export interface MemberAggregatedContext {
  memberId: string;
  gymId: string;
  fullName: string;
  fitnessGoals?: string[];
  currentWeight_kg?: number;
  targetWeight_kg?: number;
  injuries?: string[];
  attendanceStats: {
    totalVisits: number;
    averageSessionMinutes: number;
  };
  workoutStats: {
    totalWorkoutSessions: number;
    completionRatePercent: number;
    mostSkippedExercises: { exerciseId: string; name: string; skipCount: number }[];
  };
  weightTrend: { date: string; weightKg: number }[];
  wellnessAverages: {
    avgWaterMl?: number;
    avgSleepHours?: number;
  };
  recoveryScore?: number;
  recoveryCategory?: string;
  recoveryAdvice?: string;
  totalDataPoints: number;
  insufficientData: boolean;
}

export class AIDataAggregatorService {
  /**
   * Aggregate structured, token-efficient context for AI Engine
   */
  public static async buildMemberContext(
    memberId: string,
    _periodStart?: Date,
    _periodEnd?: Date
  ): Promise<MemberAggregatedContext> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
      isDeleted: false,
    }).populate('userId', 'fullName');

    if (!member) {
      throw AppError.notFound('Member profile not found for AI analysis');
    }

    // Parallel Cross-Module Aggregation
    const [attendanceStats, workoutStats, weightHistoryRes, wellnessHistoryRes] = await Promise.all([
      AttendanceService.getAttendanceStats(member._id.toString()),
      WorkoutLogService.getWorkoutCompletionStats(member._id.toString()),
      ProgressService.getWeightHistory(member._id.toString(), { limit: 10 }),
      ProgressService.getWellnessHistory(member._id.toString(), { limit: 14 }),
    ]);

    const weightTrend = weightHistoryRes.history.map((w) => ({
      date: w.dayKey,
      weightKg: w.weightKg,
    }));

    // Calculate wellness averages
    let totalWater = 0;
    let waterDays = 0;
    let totalSleep = 0;
    let sleepDays = 0;

    wellnessHistoryRes.history.forEach((w) => {
      if (w.waterIntakeMl) {
        totalWater += w.waterIntakeMl;
        waterDays++;
      }
      if (w.sleepHours) {
        totalSleep += w.sleepHours;
        sleepDays++;
      }
    });

    const avgWaterMl = waterDays > 0 ? Math.round(totalWater / waterDays) : undefined;
    const avgSleepHours = sleepDays > 0 ? Math.round((totalSleep / sleepDays) * 10) / 10 : undefined;

    const recoveryData = AIDataAggregatorService.calculateRecoveryScore(
      avgSleepHours,
      avgWaterMl,
      workoutStats.completionRatePercent,
      attendanceStats.totalVisits
    );

    const totalDataPoints =
      attendanceStats.totalVisits + workoutStats.totalWorkoutSessions + weightTrend.length;
    const insufficientData = totalDataPoints < 3;

    return {
      memberId: member._id.toString(),
      gymId: member.gymId.toString(),
      fullName: (member.userId as unknown as { fullName?: string })?.fullName || 'Member',
      fitnessGoals: member.fitnessGoals,
      currentWeight_kg: member.healthInfo?.currentWeight_kg,
      targetWeight_kg: member.healthInfo?.targetWeight_kg,
      injuries: member.healthInfo?.injuries,
      attendanceStats: {
        totalVisits: attendanceStats.totalVisits,
        averageSessionMinutes: attendanceStats.averageSessionMinutes,
      },
      workoutStats: {
        totalWorkoutSessions: workoutStats.totalWorkoutSessions,
        completionRatePercent: workoutStats.completionRatePercent,
        mostSkippedExercises: workoutStats.mostSkippedExercises,
      },
      weightTrend,
      wellnessAverages: {
        avgWaterMl,
        avgSleepHours,
      },
      recoveryScore: recoveryData.recoveryScore,
      recoveryCategory: recoveryData.recoveryCategory,
      recoveryAdvice: recoveryData.advice,
      totalDataPoints,
      insufficientData,
    };
  }

  /**
   * Deterministic Rule-Based Recovery Score Calculator (0-100 scale)
   */
  public static calculateRecoveryScore(
    sleepHours?: number,
    waterIntakeMl?: number,
    workoutCompletionRate: number = 70,
    recentVisitsCount: number = 3
  ): { recoveryScore: number; recoveryCategory: string; advice: string } {
    let score = 75; // Base score

    // Sleep modifier
    if (sleepHours !== undefined) {
      if (sleepHours >= 7.5) {
        score += 15;
      } else if (sleepHours >= 6.5) {
        score += 5;
      } else if (sleepHours >= 5.5) {
        score -= 10;
      } else {
        score -= 25;
      }
    }

    // Hydration modifier
    if (waterIntakeMl !== undefined) {
      if (waterIntakeMl >= 2500) {
        score += 10;
      } else if (waterIntakeMl >= 1500) {
        score += 5;
      } else {
        score -= 10;
      }
    }

    // Training load & Rest days modifier
    if (workoutCompletionRate >= 80 && recentVisitsCount >= 6) {
      score -= 15; // Overtraining strain penalty
    } else if (recentVisitsCount <= 4) {
      score += 10; // Well-rested bonus
    }

    // Clamp score to 0-100
    const recoveryScore = Math.min(100, Math.max(0, score));

    let recoveryCategory = 'Good to Train';
    let advice = 'Your recovery is in a solid range. Maintain good hydration and sleep.';

    if (recoveryScore >= 80) {
      recoveryCategory = 'Optimal Recovery';
      advice = 'You are fully recovered and ready for high-intensity training today!';
    } else if (recoveryScore >= 60) {
      recoveryCategory = 'Good to Train';
      advice = 'Good readiness score. Standard workout intensity is recommended.';
    } else if (recoveryScore >= 40) {
      recoveryCategory = 'Moderate Fatigue';
      advice = 'Experiencing moderate fatigue. Consider a lighter training session or active recovery.';
    } else {
      recoveryCategory = 'High Fatigue / Rest Recommended';
      advice = 'High fatigue detected due to low sleep or high cumulative strain. Prioritize rest, stretching, and hydration today.';
    }

    return { recoveryScore, recoveryCategory, advice };
  }

  /**
   * Deterministic Rule-Based Plateau Detector
   */
  public static detectPlateau(
    weightTrend: { date: string; weightKg: number }[],
    completionRatePercent: number
  ): { plateauDetected: boolean; reason?: string } {
    if (weightTrend.length < 3) {
      return { plateauDetected: false };
    }

    const latestWeight = weightTrend[0].weightKg;
    const oldestWeight = weightTrend[weightTrend.length - 1].weightKg;
    const weightDiff = Math.abs(latestWeight - oldestWeight);

    if (weightDiff < 0.5 && completionRatePercent >= 70) {
      return {
        plateauDetected: true,
        reason:
          'Weight has remained flat (<0.5kg change) over recent logs despite a high workout completion rate (>=70%).',
      };
    }

    return { plateauDetected: false };
  }

  /**
   * Deterministic Rule-Based Injury Risk Detector
   */
  public static detectInjuryRisk(
    injuries: string[] = [],
    completionRatePercent: number,
    mostSkippedExercises: { exerciseId: string; name: string; skipCount: number }[] = []
  ): { injuryRiskFlag: boolean; reason?: string } {
    if (injuries.length > 0 && completionRatePercent > 90) {
      return {
        injuryRiskFlag: true,
        reason: `Member is training at high intensity (${completionRatePercent}%) while having documented pre-existing injury conditions: ${injuries.join(
          ', '
        )}.`,
      };
    }

    if (mostSkippedExercises.some((ex) => ex.skipCount >= 3)) {
      const skippedNames = mostSkippedExercises.filter((e) => e.skipCount >= 3).map((e) => e.name);
      return {
        injuryRiskFlag: true,
        reason: `Repeatedly skipping exercises (${skippedNames.join(
          ', '
        )}) may indicate localized discomfort, fatigue, or movement pain.`,
      };
    }

    return { injuryRiskFlag: false };
  }

  /**
   * Deterministic Rule-Based Member Churn Risk Calculator
   */
  public static calculateChurnRisk(
    daysSinceLastVisit: number,
    completionRateDropPercent: number = 0,
    streakBrokenDaysAgo?: number,
    previousStreakDays: number = 0
  ): { riskLevel: 'low' | 'medium' | 'high'; riskFactors: string[] } {
    const riskFactors: string[] = [];
    let isHighRisk = false;
    let isMediumRisk = false;

    // Rule 1: No visit in 14+ days -> High Risk
    if (daysSinceLastVisit >= 14) {
      isHighRisk = true;
      riskFactors.push(`No visit in ${daysSinceLastVisit} days`);
    } else if (daysSinceLastVisit >= 7) {
      riskFactors.push(`No visit in ${daysSinceLastVisit} days`);
    }

    // Rule 2: 7+ days inactive AND completion rate dropped >30% vs previous period -> Medium Risk
    if (daysSinceLastVisit >= 7 && completionRateDropPercent > 30) {
      isMediumRisk = true;
      riskFactors.push(`Workout completion rate dropped by ${Math.round(completionRateDropPercent)}%`);
    }

    // Rule 3: 14+ day streak broken in last 7 days -> Medium Risk
    if (
      streakBrokenDaysAgo !== undefined &&
      streakBrokenDaysAgo <= 7 &&
      previousStreakDays >= 14
    ) {
      isMediumRisk = true;
      riskFactors.push(`${previousStreakDays}-day streak broken ${streakBrokenDaysAgo} days ago`);
    }

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (isHighRisk) {
      riskLevel = 'high';
    } else if (isMediumRisk) {
      riskLevel = 'medium';
    }

    if (riskFactors.length === 0) {
      riskFactors.push('Consistent attendance pattern');
    }

    return { riskLevel, riskFactors };
  }
}

