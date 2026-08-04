import { IWhatsAppProvider } from './whatsapp.interface';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

export class MetaCloudWhatsAppProvider implements IWhatsAppProvider {
  public readonly name = 'META_CLOUD';

  public async sendTemplateMessage(
    to: string,
    templateName: string,
    params: string[]
  ): Promise<{ messageId: string; status: string }> {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp Cloud API credentials (WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN) not configured');
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const cleanTo = to.replace(/[^0-9]/g, '');

    const body = {
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'template',
      template: {
        name: templateName.toLowerCase(),
        language: { code: 'en_US' },
        components: [
          {
            type: 'body',
            parameters: params.map((p) => ({ type: 'text', text: p })),
          },
        ],
      },
    };

    logger.info(`💬 Outbound Meta WhatsApp template request to [${cleanTo}]: template [${templateName}]`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meta Cloud API HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as any;
    const messageId = data?.messages?.[0]?.id || `wmid.${Date.now()}`;

    return {
      messageId,
      status: 'SENT',
    };
  }

  public async sendTextMessage(
    to: string,
    textBody: string
  ): Promise<{ messageId: string; status: string }> {
    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      throw new Error('WhatsApp Cloud API credentials not configured');
    }

    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const cleanTo = to.replace(/[^0-9]/g, '');

    const body = {
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'text',
      text: { body: textBody },
    };

    logger.info(`💬 Outbound Meta WhatsApp text request to [${cleanTo}]`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Meta Cloud API HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as any;
    const messageId = data?.messages?.[0]?.id || `wmid.${Date.now()}`;

    return {
      messageId,
      status: 'SENT',
    };
  }
}
