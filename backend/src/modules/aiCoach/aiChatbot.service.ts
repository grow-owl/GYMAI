import mongoose from 'mongoose';
import { AIConversation } from './aiConversation.model';
import { AIChatMessage } from './aiChatMessage.model';
import { AIDataAggregatorService } from './aiDataAggregator.service';
import { AIProviderFactory } from './providers/aiProvider.factory';
import { Member } from '../member/member.model';
import { User } from '../user/user.model';
import { Gym } from '../gym/gym.model';
import { Product } from '../product/product.model';
import { Expense } from '../expense/expense.model';
import { Lead } from '../lead/lead.model';
import { Trainer } from '../trainer/trainer.model';
import { IAIConversation, IAIChatMessage } from './aiCoach.types';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { logger } from '../../config/logger';

const SYSTEM_MEMBER_CHAT_PROMPT = (memberName: string, contextSummary: string, productsSummary: string) => `
You are the AI Fitness & Nutrition Coach for ${memberName} on our Gym SaaS Platform.
Context Grounding: ${contextSummary}
Available Gym Store Products & Supplements: ${productsSummary || 'Whey Protein, Creatine Monohydrate, BCAAs, Multivitamins, Personal Training Sessions'}

Rules & Directives:
1. Provide enthusiastic, scientifically sound fitness, nutrition, workout, and recovery guidance tailored to ${memberName}.
2. GYM PROMOTION & UPSELLING (BIASED IN FAVOR OF THE GYM): Whenever relevant (e.g. discussing protein gaps, muscle growth, recovery, energy levels, or workout stagnation), actively recommend relevant supplements, gear, or Personal Training sessions available in our gym's store. Highlight how buying directly from the gym ensures authentic quality and faster results!
3. Encourage consistent gym attendance and long-term membership retention.
4. MANDATORY SAFETY DISCLAIMER: Never provide medical diagnoses or drug dosages. Advise consulting a physician or certified personal trainer for injury symptoms.
`;

const SYSTEM_OWNER_CHAT_PROMPT = (ownerName: string, gymName: string, metricsSummary: string) => `
You are the AI Business & Operations Advisor for ${ownerName}, owner of ${gymName}.
Live Gym Performance Context: ${metricsSummary}

Rules & Directives:
1. Provide actionable, data-driven advice to maximize gym revenue, increase member retention, optimize trainer efficiency, and reduce expenses.
2. Suggest proactive strategies for lead conversion, member engagement, supplement sales upselling, and peak-hour crowd management.
3. Be professional, clear, and business-focused.
`;

export class AIChatbotService {
  /**
   * Helper to fetch active products for a gym
   */
  private static async getGymProductsSummary(gymId: string): Promise<string> {
    try {
      const products = await Product.find({
        gymId: new mongoose.Types.ObjectId(gymId),
        isActive: true,
        isDeleted: false,
      }).select('name price category stockQuantity');

      if (!products || products.length === 0) {
        return 'Gym Store Offerings: Whey Protein (Rs 2,499), Creatine Monohydrate (Rs 999), BCAAs (Rs 1,499), Personal Training Packages.';
      }

      return products
        .map((p) => `${p.name} (Cat: ${p.category}, Price: ₹${p.price}, Stock: ${p.stockQuantity})`)
        .join('; ');
    } catch {
      return 'Gym Store Offerings: Whey Protein, Creatine Monohydrate, BCAAs, Personal Training Packages.';
    }
  }

  /**
   * Start a New AI Chatbot Conversation (Member or Gym Owner)
   */
  public static async startConversation(
    userId: string,
    firstMessage: string,
    role: string = 'MEMBER'
  ): Promise<{ conversation: IAIConversation; replyMessage: IAIChatMessage }> {
    const isOwnerOrAdmin = ['GYM_OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(role);

    let memberIdObj: mongoose.Types.ObjectId | undefined;
    let gymIdObj: mongoose.Types.ObjectId | undefined;
    let userFullName = 'User';

    if (isOwnerOrAdmin) {
      const user = await User.findById(userId);
      if (!user) throw AppError.notFound('User profile not found');
      userFullName = user.fullName;

      const gym = await Gym.findOne({ ownerId: user._id, isDeleted: false });
      gymIdObj = gym?._id as mongoose.Types.ObjectId;
    } else {
      const member = await Member.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined },
          { userId: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined },
        ],
        isDeleted: false,
      }).populate('userId', 'fullName');

      if (!member) throw AppError.notFound('Member profile not found');
      memberIdObj = member._id as mongoose.Types.ObjectId;
      gymIdObj = member.gymId as mongoose.Types.ObjectId;
      userFullName = (member.userId as unknown as { fullName?: string })?.fullName || 'Member';
    }

    const title = firstMessage.length > 30 ? `${firstMessage.substring(0, 30)}...` : firstMessage;

    const conversation = new AIConversation({
      memberId: memberIdObj,
      gymId: gymIdObj,
      title,
      lastMessageAt: new Date(),
    });

    await conversation.save();

    // Store User Message
    const userMsg = new AIChatMessage({
      memberId: memberIdObj,
      gymId: gymIdObj,
      conversationId: conversation._id,
      role: 'user',
      content: firstMessage,
    });
    await userMsg.save();

    let systemPrompt = '';

    if (isOwnerOrAdmin && gymIdObj) {
      const [membersCount, trainersCount, leadsCount, expenses] = await Promise.all([
        Member.countDocuments({ gymId: gymIdObj, status: 'ACTIVE', isDeleted: false }),
        Trainer.countDocuments({ gymId: gymIdObj, isDeleted: false }),
        Lead.countDocuments({ gymId: gymIdObj, isDeleted: false }),
        Expense.find({ gymId: gymIdObj }).limit(10).sort({ date: -1 }),
      ]);

      const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const gym = await Gym.findById(gymIdObj);

      const metricsSummary = `Gym: ${gym?.name || 'SaaS Gym'}, Active Members: ${membersCount}, Trainers: ${trainersCount}, Active Leads: ${leadsCount}, Recent Expenses: ₹${totalExpense}`;
      systemPrompt = SYSTEM_OWNER_CHAT_PROMPT(userFullName, gym?.name || 'Gym', metricsSummary);
    } else if (memberIdObj && gymIdObj) {
      const context = await AIDataAggregatorService.buildMemberContext(memberIdObj.toString());
      const contextSummary = `Goal: ${context.fitnessGoals?.join(', ') || 'General Fitness'}, Target Weight: ${context.targetWeight_kg || 'N/A'}kg, Current Weight: ${context.currentWeight_kg || 'N/A'}kg, Visits: ${context.attendanceStats.totalVisits}`;

      const productsSummary = await AIChatbotService.getGymProductsSummary(gymIdObj.toString());
      systemPrompt = SYSTEM_MEMBER_CHAT_PROMPT(userFullName, contextSummary, productsSummary);
    } else {
      systemPrompt = `You are an AI Assistant for the Gym SaaS platform. Provide helpful, encouraging fitness & business advice.`;
    }

    // Call AI Engine with failover
    const { reply } = await AIProviderFactory.executeChatWithFailover(
      [{ role: 'user', content: firstMessage }],
      systemPrompt
    );

    // Store Assistant Reply
    const assistantMsg = new AIChatMessage({
      memberId: memberIdObj,
      gymId: gymIdObj,
      conversationId: conversation._id,
      role: 'assistant',
      content: reply,
    });
    await assistantMsg.save();

    logger.info(`💬 AI Conversation started: [ID: ${conversation._id}] [User: ${userId}]`);
    return { conversation, replyMessage: assistantMsg };
  }

  /**
   * Send Message in Existing Conversation
   */
  public static async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
    role: string = 'MEMBER'
  ): Promise<IAIChatMessage> {
    const isOwnerOrAdmin = ['GYM_OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(role);

    const conversation = await AIConversation.findOne({
      _id: conversationId,
      isArchived: false,
    });

    if (!conversation) {
      throw AppError.notFound('Conversation not found or archived');
    }

    // 1. Store User Message
    await AIChatMessage.create({
      memberId: conversation.memberId,
      gymId: conversation.gymId,
      conversationId: conversation._id,
      role: 'user',
      content,
    });

    // 2. Fetch Recent Message History (last 20 messages)
    const recentMessages = await AIChatMessage.find({ conversationId: conversation._id })
      .sort({ createdAt: -1 })
      .limit(20);

    const history = recentMessages.reverse().map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    let systemPrompt = '';

    if (isOwnerOrAdmin && conversation.gymId) {
      const gym = await Gym.findById(conversation.gymId);
      const user = await User.findById(userId);
      const membersCount = await Member.countDocuments({ gymId: conversation.gymId, status: 'ACTIVE', isDeleted: false });
      const metricsSummary = `Gym: ${gym?.name || 'Gym'}, Active Members: ${membersCount}`;
      systemPrompt = SYSTEM_OWNER_CHAT_PROMPT(user?.fullName || 'Owner', gym?.name || 'Gym', metricsSummary);
    } else if (conversation.memberId && conversation.gymId) {
      const context = await AIDataAggregatorService.buildMemberContext(conversation.memberId.toString());
      const contextSummary = `Goal: ${context.fitnessGoals?.join(', ') || 'Fitness'}, Current Weight: ${context.currentWeight_kg || 'N/A'}kg`;
      const productsSummary = await AIChatbotService.getGymProductsSummary(conversation.gymId.toString());
      systemPrompt = SYSTEM_MEMBER_CHAT_PROMPT('Member', contextSummary, productsSummary);
    } else {
      systemPrompt = `You are a helpful AI Assistant for Gym SaaS.`;
    }

    // 3. Call AI Provider with failover
    const { reply } = await AIProviderFactory.executeChatWithFailover(history, systemPrompt);

    // 4. Store Assistant Message
    const assistantMsg = new AIChatMessage({
      memberId: conversation.memberId,
      gymId: conversation.gymId,
      conversationId: conversation._id,
      role: 'assistant',
      content: reply,
    });
    await assistantMsg.save();

    conversation.lastMessageAt = new Date();
    await conversation.save();

    return assistantMsg;
  }

  /**
   * Get Conversation Message History
   */
  public static async getConversationHistory(
    conversationId: string,
    _userId: string,
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ messages: IAIChatMessage[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);

    const conversation = await AIConversation.findOne({
      _id: conversationId,
    });

    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    const filter = { conversationId: conversation._id };

    const [messages, totalItems] = await Promise.all([
      AIChatMessage.find(filter).skip(skip).limit(limit).sort({ createdAt: 1 }),
      AIChatMessage.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { messages, meta };
  }

  /**
   * List AI Conversations for User or Member
   */
  public static async listConversations(userId: string, role: string = 'MEMBER'): Promise<IAIConversation[]> {
    const isOwnerOrAdmin = ['GYM_OWNER', 'SUPER_ADMIN', 'BRANCH_MANAGER'].includes(role);

    if (isOwnerOrAdmin) {
      const user = await User.findById(userId);
      if (!user) return [];
      const gym = await Gym.findOne({ ownerId: user._id, isDeleted: false });
      if (!gym) return [];
      return AIConversation.find({ gymId: gym._id, memberId: { $exists: false }, isArchived: false }).sort({ lastMessageAt: -1 });
    }

    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(userId) ? userId : undefined },
      ],
    });

    if (!member) return [];

    return AIConversation.find({ memberId: member._id, isArchived: false }).sort({ lastMessageAt: -1 });
  }

  /**
   * Archive AI Conversation
   */
  public static async archiveConversation(conversationId: string): Promise<IAIConversation> {
    const conversation = await AIConversation.findOneAndUpdate(
      { _id: conversationId },
      { isArchived: true },
      { new: true }
    );

    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    return conversation;
  }
}

