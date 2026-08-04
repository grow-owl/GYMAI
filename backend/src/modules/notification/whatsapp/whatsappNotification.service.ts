import mongoose from 'mongoose';
import { Member } from '../../member/member.model';
import { User } from '../../user/user.model';
import { WhatsAppMessageLog } from './whatsAppMessageLog.model';
import { WhatsAppProviderFactory } from './whatsapp.factory';
import { logger } from '../../../config/logger';

export class WhatsAppNotificationService {
  /**
   * Send WhatsApp message to member (Audit logged, never throws)
   */
  public static async sendWhatsApp(
    memberId: string,
    gymId: string,
    templateKeyOrBody: string,
    params: string[] = [],
    isRawText: boolean = false
  ): Promise<boolean> {
    try {
      const member = await Member.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
          { userId: mongoose.Types.ObjectId.isValid(memberId) ? memberId : undefined },
        ],
      });

      if (!member) {
        logger.warn(`⚠️ Cannot send WhatsApp: Member profile not found [${memberId}]`);
        return false;
      }

      const user = await User.findById(member.userId);
      const phone = user?.phone;

      if (!phone) {
        logger.warn(`⚠️ Cannot send WhatsApp: Member user has no phone number [${member._id}]`);
        return false;
      }

      const provider = WhatsAppProviderFactory.getProvider();
      let providerResult: { messageId: string; status: string };

      try {
        if (isRawText) {
          providerResult = await provider.sendTextMessage(phone, templateKeyOrBody);
        } else {
          providerResult = await provider.sendTemplateMessage(phone, templateKeyOrBody, params);
        }

        await WhatsAppMessageLog.create({
          gymId: new mongoose.Types.ObjectId(gymId),
          memberId: member._id,
          phone,
          templateName: isRawText ? undefined : templateKeyOrBody,
          params: isRawText ? [] : params,
          body: isRawText ? templateKeyOrBody : undefined,
          status: 'SENT',
          providerMessageId: providerResult.messageId,
          sentAt: new Date(),
        });

        logger.info(`✅ WhatsApp message delivered to [${phone}]: [ID: ${providerResult.messageId}]`);
        return true;
      } catch (sendError: any) {
        const errorReason = sendError?.message || String(sendError);
        logger.error(`❌ WhatsApp provider delivery failed for member [${member._id}]: ${errorReason}`);

        await WhatsAppMessageLog.create({
          gymId: new mongoose.Types.ObjectId(gymId),
          memberId: member._id,
          phone,
          templateName: isRawText ? undefined : templateKeyOrBody,
          params: isRawText ? [] : params,
          body: isRawText ? templateKeyOrBody : undefined,
          status: 'FAILED',
          errorReason,
          sentAt: new Date(),
        });

        return false;
      }
    } catch (outerError) {
      logger.error(`❌ Safe sendWhatsApp error guard caught exception: ${outerError}`);
      return false;
    }
  }

  /**
   * List WhatsApp message logs for a gym (newest first)
   */
  public static async listMessageLog(
    gymId: string,
    filters?: { status?: string; memberId?: string }
  ) {
    const filter: any = { gymId: new mongoose.Types.ObjectId(gymId) };
    if (filters?.status) {
      filter.status = filters.status;
    }
    if (filters?.memberId && mongoose.Types.ObjectId.isValid(filters.memberId)) {
      filter.memberId = new mongoose.Types.ObjectId(filters.memberId);
    }

    const logs = await WhatsAppMessageLog.find(filter)
      .populate({
        path: 'memberId',
        select: 'userId phone name',
        populate: { path: 'userId', select: 'fullName email' },
      })
      .sort({ sentAt: -1, createdAt: -1 })
      .limit(100);

    return logs;
  }
}
