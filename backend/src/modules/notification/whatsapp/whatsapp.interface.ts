export interface IWhatsAppProvider {
  name: string;
  sendTemplateMessage(
    to: string,
    templateName: string,
    params: string[]
  ): Promise<{ messageId: string; status: string }>;
  sendTextMessage(
    to: string,
    body: string
  ): Promise<{ messageId: string; status: string }>;
}
