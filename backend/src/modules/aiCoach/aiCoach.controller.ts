import { Request, Response } from 'express';
import { AICoachService } from './aiCoach.service';
import { AIChatbotService } from './aiChatbot.service';
import { ChurnPredictionService } from './churnPrediction.service';
import { OwnerInsightsService } from './ownerInsights.service';
import { SupplementPTRecommendationService } from './supplementPTRecommendation.service';
import { AIReport } from './aiReport.model';
import { AIReportType } from './aiCoach.types';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';

export class AICoachController {
  public static getSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const suggestions = await AICoachService.generatePersonalizedSuggestions(memberId);
    return sendSuccess(res, suggestions, 'Personalized AI suggestions generated successfully');
  });

  public static getDietRecommendation = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const dietRec = await AICoachService.generateDietRecommendation(memberId);
    return sendSuccess(res, dietRec, 'AI diet recommendation generated successfully');
  });

  public static getReports = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const type = (req.query.type as AIReportType) || AIReportType.WEEKLY;

    const reports = await AIReport.find({ memberId, type }).sort({ periodStart: -1 });
    return sendSuccess(res, { reports, type }, 'AI reports retrieved successfully');
  });

  public static generateNewReport = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const type = (req.query.type as AIReportType) || AIReportType.WEEKLY;

    const report = await AICoachService.generateReport(memberId, type);
    return sendSuccess(res, { report }, 'New AI report generated successfully', 201);
  });

  public static getGoalPrediction = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const goalType = (req.query.goalType as string) || 'target_weight';

    const prediction = await AICoachService.predictGoalAchievement(memberId, goalType);
    return sendSuccess(res, { prediction }, 'Goal prediction generated successfully');
  });

  // Chatbot Endpoints
  public static startConversation = asyncHandler(async (req: Request, res: Response) => {
    const { firstMessage } = req.body;
    const result = await AIChatbotService.startConversation(req.user!.id, firstMessage);
    return sendSuccess(res, result, 'AI Chat conversation started successfully', 201);
  });

  public static sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { content } = req.body;

    const replyMessage = await AIChatbotService.sendMessage(conversationId, req.user!.id, content);
    return sendSuccess(res, { replyMessage }, 'AI Chat message processed successfully');
  });

  public static getConversationHistory = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const { messages, meta } = await AIChatbotService.getConversationHistory(
      conversationId,
      req.user!.id,
      req.query
    );

    return sendSuccess(res, { messages }, 'Conversation history retrieved successfully', 200, {
      pagination: meta,
    });
  });

  public static listConversations = asyncHandler(async (req: Request, res: Response) => {
    const conversations = await AIChatbotService.listConversations(req.user!.id);
    return sendSuccess(res, { conversations }, 'AI conversations listed successfully');
  });

  public static archiveConversation = asyncHandler(async (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const conversation = await AIChatbotService.archiveConversation(conversationId, req.user!.id);
    return sendSuccess(res, { conversation }, 'Conversation archived successfully');
  });

  // Module 1: Member Churn Prediction
  public static getAtRiskMembers = asyncHandler(async (req: Request, res: Response) => {
    const { gymId } = req.params;
    const { branchId, riskLevel } = req.query;

    const atRiskMembers = await ChurnPredictionService.getAtRiskMembers(
      gymId,
      branchId as string | undefined,
      riskLevel as 'low' | 'medium' | 'high' | undefined
    );
    return sendSuccess(res, { atRiskMembers }, 'At-risk members retrieved successfully');
  });

  // AI Owner Insights Extensions
  public static getTrainerPerformance = asyncHandler(async (req: Request, res: Response) => {
    const { gymId } = req.params;
    const trainerPerformance = await OwnerInsightsService.getTrainerPerformanceComparison(gymId);
    return sendSuccess(res, { trainerPerformance }, 'Trainer performance comparison retrieved successfully');
  });

  public static getPeakHours = asyncHandler(async (req: Request, res: Response) => {
    const { gymId } = req.params;
    const { branchId } = req.query;
    const peakHours = await OwnerInsightsService.getPeakHoursAnalysis(gymId, branchId as string | undefined);
    return sendSuccess(res, { peakHours }, 'Peak hours analysis retrieved successfully');
  });

  public static getRevenueForecast = asyncHandler(async (req: Request, res: Response) => {
    const { gymId } = req.params;
    const revenueForecast = await OwnerInsightsService.getRevenueForecast(gymId);
    return sendSuccess(res, { revenueForecast }, 'Revenue forecast generated successfully');
  });

  public static getPlanProfitability = asyncHandler(async (req: Request, res: Response) => {
    const { gymId } = req.params;
    const planProfitability = await OwnerInsightsService.getPlanProfitabilityAnalysis(gymId);
    return sendSuccess(res, { planProfitability }, 'Plan profitability analysis retrieved successfully');
  });

  public static getWeeklyDigest = asyncHandler(async (req: Request, res: Response) => {
    const { gymId } = req.params;
    const weeklyDigest = await OwnerInsightsService.generateWeeklyOwnerDigest(gymId);
    return sendSuccess(res, { weeklyDigest }, 'Weekly owner digest generated successfully');
  });

  public static getUpsellRecommendation = asyncHandler(async (req: Request, res: Response) => {
    const memberId = req.params.memberId || req.user!.id;
    const recommendation = await SupplementPTRecommendationService.generateUpsellRecommendation(memberId);
    return sendSuccess(res, recommendation, 'AI Supplement & PT recommendation generated successfully');
  });
}


