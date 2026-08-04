import { IWhatsAppProvider } from './whatsapp.interface';
import { MetaCloudWhatsAppProvider } from './metaCloud.provider';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

class MockWhatsAppProvider implements IWhatsAppProvider {
  public readonly name = 'MOCK_WHATSAPP';

  public async sendTemplateMessage(
    to: string,
    templateName: string,
    params: string[]
  ): Promise<{ messageId: string; status: string }> {
    const mockMessageId = `wmid.mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    logger.info(
      `💬 [MOCK WHATSAPP] Template message to [${to}]: template [${templateName}] params [${params.join(', ')}]`
    );
    return { messageId: mockMessageId, status: 'SENT' };
  }

  public async sendTextMessage(
    to: string,
    body: string
  ): Promise<{ messageId: string; status: string }> {
    const mockMessageId = `wmid.mock_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    logger.info(`💬 [MOCK WHATSAPP] Text message to [${to}]: "${body}"`);
    return { messageId: mockMessageId, status: 'SENT' };
  }
}

export class WhatsAppProviderFactory {
  private static realProvider = new MetaCloudWhatsAppProvider();
  private static mockProvider = new MockWhatsAppProvider();

  public static isMockMode(): boolean {
    const isTest = env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test';
    const token = env.WHATSAPP_ACCESS_TOKEN;
    const hasValidToken = Boolean(token && !token.includes('your_') && !token.includes('dummy'));

    return isTest || !hasValidToken;
  }

  public static getProvider(): IWhatsAppProvider {
    if (this.isMockMode()) {
      return this.mockProvider;
    }
    return this.realProvider;
  }
}
