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
      logger.info('🤖 Gemini API in mock mode — returning chat reply');
      const lastMsg = conversationHistory[conversationHistory.length - 1]?.content || '';
      return `Gemini AI Coach: Regarding your question about "${lastMsg}", consistency is key. Ensure proper form and adequate rest! (Disclaimer: Consult a physician for medical advice).`;
    }

    try {
      const formattedContents = conversationHistory.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
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
        throw new Error(`Gemini Chat API error: HTTP ${response.status}`);
      }

      const data = (await response.json()) as GeminiResponse;
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      logger.error(`Gemini Chat Provider Error: ${error}`);
      throw error;
    }
  }
}
