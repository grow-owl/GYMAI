import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import { AIProvider } from '../aiCoach.types';
import { env } from '../../../config/env';
import { AppError } from '../../../common/utils/AppError';
import { ErrorCode } from '../../../common/constants/errorCodes.enum';
import { logger } from '../../../config/logger';

export class AIProviderFactory {
  private static openai = new OpenAIProvider();
  private static gemini = new GeminiProvider();

  /**
   * Helper to resolve effective primary provider based on env configuration
   */
  private static getEffectivePrimary(preferred?: AIProvider): AIProvider {
    const hasOpenAIKey = Boolean(
      env.OPENAI_API_KEY &&
      !env.OPENAI_API_KEY.includes('your_') &&
      !env.OPENAI_API_KEY.includes('dummy')
    );
    const hasGeminiKey = Boolean(
      env.GEMINI_API_KEY &&
      !env.GEMINI_API_KEY.includes('your_') &&
      !env.GEMINI_API_KEY.includes('dummy')
    );

    // If requested provider key is missing but the other provider key is valid, auto-switch to available key
    if (preferred === AIProvider.OPENAI && !hasOpenAIKey && hasGeminiKey) {
      logger.info('💡 Preferred OpenAI key missing — auto-routing to available Gemini AI');
      return AIProvider.GEMINI;
    }
    if (preferred === AIProvider.GEMINI && !hasGeminiKey && hasOpenAIKey) {
      logger.info('💡 Preferred Gemini key missing — auto-routing to available OpenAI AI');
      return AIProvider.OPENAI;
    }
    if (preferred) return preferred;

    // No explicit preference requested — pick active provider automatically
    if (hasGeminiKey && !hasOpenAIKey) {
      return AIProvider.GEMINI;
    }
    return AIProvider.OPENAI;
  }

  /**
   * Execute AI Completion with automatic failover (Primary -> Secondary)
   */
  public static async executeWithFailover(
    systemPrompt: string,
    userPrompt: string,
    options: { jsonMode?: boolean; preferredProvider?: AIProvider } = {}
  ): Promise<{ result: string; providerUsed: AIProvider }> {
    const primaryProviderType = this.getEffectivePrimary(options.preferredProvider);
    const primary = primaryProviderType === AIProvider.OPENAI ? this.openai : this.gemini;
    const secondary = primaryProviderType === AIProvider.OPENAI ? this.gemini : this.openai;
    const secondaryType = primaryProviderType === AIProvider.OPENAI ? AIProvider.GEMINI : AIProvider.OPENAI;

    try {
      const result = await primary.generateCompletion(systemPrompt, userPrompt, options);
      return { result, providerUsed: primaryProviderType };
    } catch (primaryError) {
      logger.warn(`⚠️ Primary AI Provider (${primaryProviderType}) failed: ${primaryError}. Retrying with secondary fallback provider (${secondaryType})...`);
      try {
        const result = await secondary.generateCompletion(systemPrompt, userPrompt, options);
        return { result, providerUsed: secondaryType };
      } catch (secondaryError) {
        logger.error(`❌ Secondary AI Provider (${secondaryType}) also failed: ${secondaryError}`);
        throw new AppError('AI service is temporarily unavailable. Please try again shortly.', 503, ErrorCode.AI_SERVICE_UNAVAILABLE);
      }
    }
  }

  /**
   * Execute Chat Reply with automatic failover (Primary -> Secondary)
   */
  public static async executeChatWithFailover(
    conversationHistory: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string,
    preferredProvider?: AIProvider
  ): Promise<{ reply: string; providerUsed: AIProvider }> {
    const primaryProviderType = this.getEffectivePrimary(preferredProvider);
    const primary = primaryProviderType === AIProvider.OPENAI ? this.openai : this.gemini;
    const secondary = primaryProviderType === AIProvider.OPENAI ? this.gemini : this.openai;
    const secondaryType = primaryProviderType === AIProvider.OPENAI ? AIProvider.GEMINI : AIProvider.OPENAI;

    try {
      const reply = await primary.generateChatReply(conversationHistory, systemPrompt);
      return { reply, providerUsed: primaryProviderType };
    } catch (primaryError) {
      logger.warn(`⚠️ Primary AI Chat Provider (${primaryProviderType}) failed: ${primaryError}. Retrying with secondary (${secondaryType})...`);
      try {
        const reply = await secondary.generateChatReply(conversationHistory, systemPrompt);
        return { reply, providerUsed: secondaryType };
      } catch (secondaryError) {
        logger.error(`❌ Secondary AI Chat Provider (${secondaryType}) also failed: ${secondaryError}`);
        throw new AppError('AI Chat service is temporarily unavailable.', 503, ErrorCode.AI_SERVICE_UNAVAILABLE);
      }
    }
  }
}
