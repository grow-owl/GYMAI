import { IAIProvider } from './aiProvider.interface';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
}

export class GeminiProvider implements IAIProvider {
  public readonly name = 'GEMINI';

  private isMockMode(): boolean {
    if (!env.GEMINI_API_KEY) return true;
    if (env.GEMINI_API_KEY.includes('your_') || env.GEMINI_API_KEY.includes('dummy') || env.NODE_ENV === 'test') {
      return true;
    }
    return false;
  }

  public async generateCompletion(
    systemPrompt: string,
    userPrompt: string,
    options: { jsonMode?: boolean } = {}
  ): Promise<string> {
    if (this.isMockMode()) {
      logger.info('🤖 Gemini API in mock mode — returning structured completion');
      if (options.jsonMode) {
        return JSON.stringify({
          insights: [
            'Gemini AI: Excellent work maintaining 80%+ workout completion rate.',
            'Sleep duration averaged 7.8 hours, supporting CNS recovery.',
          ],
          recommendations: [
            'Add progressive overload on bench press by +2.5kg next cycle.',
            'Maintain caloric deficit of 300 kcal/day for fat loss goal.',
          ],
        });
      }
      return 'Mock Gemini Completion: Progress looks consistent! Stay focused on your hydration and active recovery routines.';
    }

    try {
      const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nUser Request: ${userPrompt}` }],
            },
          ],
          generationConfig: {
            responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error (${model}): HTTP ${response.status}`);
      }

      const data = (await response.json()) as GeminiResponse;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      logger.error(`Gemini Provider Error: ${error}`);
      throw error;
    }
  }

  public async generateChatReply(
    conversationHistory: { role: 'user' | 'assistant'; content: string }[],
    systemPrompt: string
  ): Promise<string> {
    if (this.isMockMode()) {
      logger.info('🤖 Gemini API in mock mode — bypassing external API');
      throw new Error('Gemini API in mock mode');
    }

    const candidateModels = Array.from(new Set([
      env.GEMINI_MODEL || 'gemini-1.5-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro'
    ]));

    const formattedContents = conversationHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: formattedContents,
          }),
        });

        if (!response.ok) {
          const errBody = await response.text().catch(() => '');
          throw new Error(`Gemini Chat API error (${model}): HTTP ${response.status} - ${errBody}`);
        }

        const data = (await response.json()) as GeminiResponse;
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          logger.info(`✅ Gemini API response successfully generated using model ${model}`);
          return replyText;
        }
      } catch (error) {
        lastError = error;
        logger.warn(`⚠️ Gemini model ${model} failed, trying next candidate...`);
      }
    }

    logger.error(`Gemini Chat Provider Error: ${lastError}`);
    throw lastError || new Error('Failed to generate response from Gemini API');
  }
}
