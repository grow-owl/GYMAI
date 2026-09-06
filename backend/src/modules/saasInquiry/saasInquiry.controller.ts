import { Request, Response } from 'express';
import { SaasInquiryService } from './saasInquiry.service';
import { createSaasInquirySchema, updateSaasInquiryStatusSchema, addSaasInquiryNoteSchema } from './saasInquiry.validation';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { SaasInquiryStatus } from './saasInquiry.types';

export class SaasInquiryController {
  public static async create(req: Request, res: Response): Promise<void> {
    const validatedData = createSaasInquirySchema.parse(req.body);
    const inquiry = await SaasInquiryService.createInquiry(validatedData);

    sendSuccess(
      res,
      {
        id: inquiry._id,
        ownerName: inquiry.ownerName,
        gymName: inquiry.gymName,
        createdAt: inquiry.createdAt,
      },
      'Thank you! Your demo request and SaaS workspace inquiry has been submitted. Our team will contact you shortly.',
      201
    );
  }

  public static async list(req: Request, res: Response): Promise<void> {
    const { status, limit, page } = req.query;
    const result = await SaasInquiryService.listInquiries({
      status: status as string,
      limit: limit ? Number(limit) : undefined,
      page: page ? Number(page) : undefined,
    });

    sendSuccess(res, result, 'SaaS inquiries retrieved successfully');
  }

  public static async updateStatus(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const validatedData = updateSaasInquiryStatusSchema.parse(req.body);

    const updated = await SaasInquiryService.updateStatus(
      id,
      validatedData.status as SaasInquiryStatus,
      validatedData.note,
      req.user?.id,
      validatedData.trialGymId
    );

    sendSuccess(res, updated, 'Inquiry status updated successfully');
  }

  public static async addNote(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const validatedData = addSaasInquiryNoteSchema.parse(req.body);

    const updated = await SaasInquiryService.addNote(id, validatedData.note, req.user?.id);
    sendSuccess(res, updated, 'Follow-up note added successfully');
  }
}
