import mongoose from 'mongoose';
import { AIConversation } from './aiConversation.model';
import { AIChatMessage } from './aiChatMessage.model';
import { AIDataAggregatorService } from './aiDataAggregator.service';
import { AIProviderFactory } from './providers/aiProvider.factory';
import { Member } from '../member/member.model';
import { IAIConversation, IAIChatMessage } from './aiCoach.types';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';
import { logger } from '../../config/logger';

const SYSTEM_CHAT_PROMPT_TEMPLATE = (memberName: string, contextSummary: string) => `
You are the AI Fitness Coach for ${memberName} on our Gym SaaS Platform.
Context Grounding: ${contextSummary}

Rules:
1. Stay strictly within fitness, workout, nutrition, hydration, and exercise motivation scope.
2. Be polite, encouraging, and concise.
3. MANDATORY SAFETY DISCLAIMER: Never provide medical diagnoses, physical therapy prescriptions, or drug dosages. Always advise consulting a medical professional for injury symptoms or health conditions.
`;

export class AIChatbotService {
  /**
   * Start a New AI Chatbot Conversation
   */
  public static async startConversation(
    memberId: string,
    firstMessage: string
  ): Promise<{ conversation: IAIConversation; replyMessage: IAIChatMessage }> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
      isDeleted: false,
    }).populate('userId', 'fullName');

    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    const title = firstMessage.length > 30 ? `${firstMessage.substring(0, 30)}...` : firstMessage;

    const conversation = new AIConversation({
      memberId: member._id,
      gymId: member.gymId,
      title,
      lastMessageAt: new Date(),
    });

    await conversation.save();

    // Store User Message
    const userMsg = new AIChatMessage({
      memberId: member._id,
      gymId: member.gymId,
      conversationId: conversation._id,
      role: 'user',
      content: firstMessage,
    });
    await userMsg.save();

    // Build Grounding Context Summary
    const context = await AIDataAggregatorService.buildMemberContext(member._id.toString());
    const contextSummary = `Goal: ${context.fitnessGoals?.join(', ') || 'General Fitness'}, Target Weight: ${
      context.targetWeight_kg || 'N/A'
    }kg, Attendance Visits: ${context.attendanceStats.totalVisits}`;

    const memberFullName = (member.userId as unknown as { fullName?: string })?.fullName || 'Member';
    const systemPrompt = SYSTEM_CHAT_PROMPT_TEMPLATE(memberFullName, contextSummary);

    // Call AI Engine with failover
    const { reply } = await AIProviderFactory.executeChatWithFailover(
      [{ role: 'user', content: firstMessage }],
      systemPrompt
    );

    // Store Assistant Reply
    const assistantMsg = new AIChatMessage({
      memberId: member._id,
      gymId: member.gymId,
      conversationId: conversation._id,
      role: 'assistant',
      content: reply,
    });
    await assistantMsg.save();

    logger.info(`💬 AI Conversation started: [ID: ${conversation._id}] [Member: ${member._id}]`);
    return { conversation, replyMessage: assistantMsg };
  }

  /**
   * Send Message in Existing Conversation
   */
  public static async sendMessage(
    conversationId: string,
    memberId: string,
    content: string
  ): Promise<IAIChatMessage> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
    });

    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    const conversation = await AIConversation.findOne({
      _id: conversationId,
      memberId: member._id,
      isArchived: false,
    });

    if (!conversation) {
      throw AppError.notFound('Conversation not found or archived');
    }

    // 1. Store User Message
    await AIChatMessage.create({
      memberId: member._id,
      gymId: member.gymId,
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

    const context = await AIDataAggregatorService.buildMemberContext(member._id.toString());
    const contextSummary = `Goal: ${context.fitnessGoals?.join(', ') || 'Fitness'}, Current Weight: ${
      context.currentWeight_kg || 'N/A'
    }kg`;

    const systemPrompt = SYSTEM_CHAT_PROMPT_TEMPLATE('Member', contextSummary);

    // 3. Call AI Provider with failover
    const { reply } = await AIProviderFactory.executeChatWithFailover(history, systemPrompt);

    // 4. Store Assistant Message
    const assistantMsg = new AIChatMessage({
      memberId: member._id,
      gymId: member.gymId,
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
    memberId: string,
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ messages: IAIChatMessage[]; meta: ReturnType<typeof buildPaginationMeta> }> {
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

    const conversation = await AIConversation.findOne({
      _id: conversationId,
      memberId: member._id,
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
   * List Member AI Conversations
   */
  public static async listConversations(memberId: string): Promise<IAIConversation[]> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
    });

    if (!member) return [];

    return AIConversation.find({ memberId: member._id, isArchived: false }).sort({ lastMessageAt: -1 });
  }

  /**
   * Archive AI Conversation
   */
  public static async archiveConversation(conversationId: string, memberId: string): Promise<IAIConversation> {
    const member = await Member.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
      ],
    });

    if (!member) {
      throw AppError.notFound('Member profile not found');
    }

    const conversation = await AIConversation.findOneAndUpdate(
      { _id: conversationId, memberId: member._id },
      { isArchived: true },
      { new: true }
    );

    if (!conversation) {
      throw AppError.notFound('Conversation not found');
    }

    return conversation;
  }
}
