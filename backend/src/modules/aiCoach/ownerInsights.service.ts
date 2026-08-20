import mongoose from 'mongoose';
import { MemberPaymentService } from '../payment/memberPayment.service';
import { ExpenseService } from '../expense/expense.service';
import { Trainer } from '../trainer/trainer.model';
import { Member } from '../member/member.model';
import { Attendance } from '../attendance/attendance.model';
import { WorkoutLog } from '../workout/workoutLog.model';
import { ChurnPredictionService } from './churnPrediction.service';
import { AIProviderFactory } from './providers/aiProvider.factory';
import { logger } from '../../config/logger';

export class OwnerInsightsService {
  /**
   * Aggregate gym-wide business context
   */
  public static async buildGymBusinessContext(
    gymId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<Record<string, unknown>> {
    const startDate = periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = periodEnd || new Date();

    const [revenueSummary, expenseSummary, peakHours, trainerComparison, planProfitability] =
      await Promise.all([
        MemberPaymentService.getRevenueSummary(gymId, { startDate, endDate }),
        ExpenseService.getExpensesSummary(gymId, { startDate, endDate }),
        OwnerInsightsService.getPeakHoursAnalysis(gymId),
        OwnerInsightsService.getTrainerPerformanceComparison(gymId),
        OwnerInsightsService.getPlanProfitabilityAnalysis(gymId),
      ]);

    const totalRevenue = revenueSummary.totalRevenue;
    const totalExpenses = expenseSummary.totalExpenses;
    const netProfit = totalRevenue - totalExpenses;

    return {
      period: { startDate, endDate },
      totalRevenue,
      totalExpenses,
      netProfit,
      expensesByCategory: expenseSummary.expensesByCategory,
      peakHours,
      trainerComparison,
      planProfitability,
    };
  }

  /**
   * Deterministic Trainer Performance Ranking (Pure aggregation, no AI guessing)
   */
  public static async getTrainerPerformanceComparison(gymId: string): Promise<any[]> {
    const trainers = await Trainer.find({
      gymId: new mongoose.Types.ObjectId(gymId),
      isDeleted: false,
    }).populate('userId', 'fullName email avatarUrl');

    const comparisons = await Promise.all(
      trainers.map(async (trainer) => {
        const assignedMembers = await Member.find({
          assignedTrainerId: trainer._id,
          isDeleted: false,
        }).select('_id');

        const memberIds = assignedMembers.map((m) => m._id);
        const assignedCount = memberIds.length;

        if (assignedCount === 0) {
          return {
            trainerId: trainer._id,
            trainerName: (trainer.userId as any)?.fullName || 'Trainer',
            assignedMembersCount: 0,
            avgWorkoutCompletionRate: 0,
            avgAttendanceVisits: 0,
            score: 0,
          };
        }

        // Aggregate workout completion rate
        const workoutAgg = await WorkoutLog.aggregate([
          { $match: { memberId: { $in: memberIds } } },
          {
            $addFields: {
              isLogCompleted: {
                $and: [
                  { $gt: [{ $size: { $ifNull: ['$exercises', []] } }, 0] },
                  {
                    $allElementsTrue: {
                      $map: {
                        input: '$exercises',
                        as: 'ex',
                        in: {
                          $or: [
                            { $ne: [{ $ifNull: ['$$ex.completedAt', null] }, null] },
                            {
                              $gt: [
                                {
                                  $size: {
                                    $filter: {
                                      input: { $ifNull: ['$$ex.sets', []] },
                                      as: 's',
                                      cond: { $eq: ['$$s.completed', true] },
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: ['$isLogCompleted', 1, 0] } },
            },
          },
        ]);

        const totalWorkouts = workoutAgg[0]?.total || 0;
        const completedWorkouts = workoutAgg[0]?.completed || 0;
        const avgWorkoutCompletionRate =
          totalWorkouts > 0 ? Math.round((completedWorkouts / totalWorkouts) * 100) : 0;

        // Aggregate attendance visits
        const attendanceAgg = await Attendance.aggregate([
          { $match: { memberId: { $in: memberIds } } },
          {
            $group: {
              _id: '$memberId',
              visitCount: { $sum: 1 },
            },
          },
        ]);

        const totalVisitsAcrossMembers = attendanceAgg.reduce((sum, item) => sum + item.visitCount, 0);
        const avgAttendanceVisits =
          assignedCount > 0 ? Math.round((totalVisitsAcrossMembers / assignedCount) * 10) / 10 : 0;

        // Deterministic composite performance score (0-100)
        const score = Math.min(100, Math.round(avgWorkoutCompletionRate * 0.6 + avgAttendanceVisits * 4));

        return {
          trainerId: trainer._id,
          trainerName: (trainer.userId as any)?.fullName || 'Trainer',
          specializations: trainer.specializations,
          assignedMembersCount: assignedCount,
          avgWorkoutCompletionRate,
          avgAttendanceVisits,
          score,
        };
      })
    );

    return comparisons.sort((a, b) => b.score - a.score);
  }

  /**
   * Peak Hours Heatmap Analysis (Check-ins grouped by day of week & hour of day)
   */
  public static async getPeakHoursAnalysis(
    gymId: string,
    branchId?: string
  ): Promise<{ dayOfWeek: number; hour: number; checkInCount: number }[]> {
    const matchFilter: Record<string, unknown> = {
      gymId: new mongoose.Types.ObjectId(gymId),
    };

    if (branchId) {
      matchFilter.branchId = new mongoose.Types.ObjectId(branchId);
    }

    const peakAgg = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            dayOfWeek: { $dayOfWeek: '$checkInAt' }, // 1 = Sunday, 7 = Saturday
            hour: { $hour: '$checkInAt' },
          },
          checkInCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } },
      {
        $project: {
          _id: 0,
          dayOfWeek: '$_id.dayOfWeek',
          hour: '$_id.hour',
          checkInCount: 1,
        },
      },
    ]);

    return peakAgg;
  }

  /**
   * Deterministic Revenue Projection (Linear trend + membership renewal forecast)
   */
  public static async getRevenueForecast(
    gymId: string
  ): Promise<{ projectedRevenue: number; confidence: 'low' | 'medium' | 'high'; explanation: string }> {
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const revenueSummary = await MemberPaymentService.getRevenueSummary(gymId, {
      startDate: threeMonthsAgo,
      endDate: now,
    });

    const monthlyBreakdown = revenueSummary.breakdown;
    const historyMonthsCount = monthlyBreakdown.length;

    let confidence: 'low' | 'medium' | 'high' = 'high';
    if (historyMonthsCount < 2) {
      confidence = 'low';
    } else if (historyMonthsCount < 3) {
      confidence = 'medium';
    }

    // Average monthly revenue over available history
    const totalHistRevenue = monthlyBreakdown.reduce((sum, item) => sum + item.totalRevenue, 0);
    const avgMonthlyRevenue = historyMonthsCount > 0 ? totalHistRevenue / historyMonthsCount : 0;

    // Upcoming expiring memberships next month
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringMembersCount = await Member.countDocuments({
      gymId: new mongoose.Types.ObjectId(gymId),
      membershipEndDate: { $gte: now, $lte: nextMonth },
      isDeleted: false,
    });

    // Projected renewal addition (assuming 75% baseline renewal rate and avg payment of 2000 INR per renewal)
    const projectedRenewalRevenue = expiringMembersCount * 0.75 * 2000;
    const projectedRevenue = Math.round(avgMonthlyRevenue * 0.7 + projectedRenewalRevenue * 0.3);

    const explanation = `Projected next month revenue of ₹${projectedRevenue.toLocaleString()} based on ${historyMonthsCount} month(s) historical trend and ${expiringMembersCount} upcoming membership renewals.`;

    return {
      projectedRevenue,
      confidence,
      explanation,
    };
  }

  /**
   * Plan Profitability & Average Member Lifetime Analysis
   */
  public static async getPlanProfitabilityAnalysis(gymId: string): Promise<any[]> {
    const planAgg = await Member.aggregate([
      {
        $match: {
          gymId: new mongoose.Types.ObjectId(gymId),
          isDeleted: false,
        },
      },
      {
        $project: {
          planName: 1,
          membershipStartDate: 1,
          membershipEndDate: 1,
          durationDays: {
            $divide: [
              { $subtract: ['$membershipEndDate', '$membershipStartDate'] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$planName',
          memberCount: { $sum: 1 },
          avgLifetimeDays: { $avg: '$durationDays' },
        },
      },
    ]);

    const result = await Promise.all(
      planAgg.map(async (plan) => {
        const planName = plan._id || 'Standard';
        const memberCount = plan.memberCount;
        const avgLifetimeDays = Math.round(plan.avgLifetimeDays || 30);

        // Fetch total revenue for members on this plan
        const membersOnPlan = await Member.find({
          gymId: new mongoose.Types.ObjectId(gymId),
          planName,
          isDeleted: false,
        }).select('_id');

        const memberIds = membersOnPlan.map((m) => m._id);

        const paymentAgg = await MemberPaymentService.listPayments(gymId, {}, { limit: 1000 });
        const planPayments = paymentAgg.payments.filter((p) =>
          memberIds.some((id) => id.toString() === p.memberId.toString())
        );

        const totalRevenue = planPayments.reduce((sum, p) => sum + p.amount, 0);

        return {
          planName,
          memberCount,
          avgLifetimeDays,
          totalRevenue,
        };
      })
    );

    return result.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * Generate Plain-Language Weekly Executive Digest for Gym Owner using AI Provider
   */
  public static async generateWeeklyOwnerDigest(gymId: string): Promise<string> {
    try {
      const [businessContext, atRiskMembers, revenueForecast] = await Promise.all([
        OwnerInsightsService.buildGymBusinessContext(gymId),
        ChurnPredictionService.getAtRiskMembers(gymId, undefined, 'high'),
        OwnerInsightsService.getRevenueForecast(gymId),
      ]);

      const promptPayload = {
        summary: `Weekly Business Performance Overview for Gym Owner:`,
        metrics: {
          totalRevenue: businessContext.totalRevenue,
          totalExpenses: businessContext.totalExpenses,
          netProfit: businessContext.netProfit,
          atRiskHighCount: atRiskMembers.length,
          projectedNextMonthRevenue: revenueForecast.projectedRevenue,
        },
        trainerTopPerformer: (businessContext.trainerComparison as any[])[0]?.trainerName || 'N/A',
        peakHourSample: (businessContext.peakHours as any[])[0] || 'N/A',
      };

      const systemPrompt = `You are an elite Gym Business Strategy AI Advisor. Write a concise, 3-4 sentence plain-language weekly summary highlighting the top 2-3 most critical business metrics, revenue performance, and churn risk for the gym owner. Be professional, direct, and actionable.`;

      const { result: aiResponse } = await AIProviderFactory.executeWithFailover(
        systemPrompt,
        JSON.stringify(promptPayload)
      );

      return (
        aiResponse ||
        `Weekly Summary: Total revenue is ₹${businessContext.totalRevenue} with a net profit of ₹${businessContext.netProfit}. High churn risk flagged for ${atRiskMembers.length} members. Projected next month revenue is ₹${revenueForecast.projectedRevenue}.`
      );
    } catch (error) {
      logger.warn(`AI Weekly Owner Digest generation failed, using structured fallback: ${error}`);
      const businessContext = await OwnerInsightsService.buildGymBusinessContext(gymId);
      return `Weekly Summary: Recorded ₹${businessContext.totalRevenue} in revenue against ₹${businessContext.totalExpenses} in expenses. Net profit stands at ₹${businessContext.netProfit}. Continue monitoring peak hours and trainer workloads.`;
    }
  }
}
