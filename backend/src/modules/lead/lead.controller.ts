import { Request, Response, NextFunction } from 'express';
import { LeadService } from './lead.service';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { assertTenantMatch } from '../../common/middlewares/tenant.middleware';
import { LeadStatus } from './lead.types';

export class LeadController {
  public static async createLead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gymId, branchId } = req.params;
      assertTenantMatch(gymId, req);

      const lead = await LeadService.createLead(gymId, branchId, req.body);
      sendSuccess(res, lead, 'Lead created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  public static async listLeads(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gymId, branchId } = req.params;
      assertTenantMatch(gymId, req);

      const { status, search, page, limit } = req.query;
      const result = await LeadService.listLeads(
        gymId,
        branchId,
        { status: status as LeadStatus, search: search as string },
        { page: page as string, limit: limit as string }
      );

      sendSuccess(res, result.leads, 'Leads fetched successfully', 200, {
        pagination: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateLeadStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId } = req.params;
      const gymId = req.tenant!.gymId;

      const { status, trialDate } = req.body;
      const lead = await LeadService.updateLeadStatus(
        leadId,
        gymId!,
        status,
        trialDate ? new Date(trialDate) : undefined
      );

      sendSuccess(res, lead, 'Lead status updated successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async addFollowUpNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId } = req.params;
      const gymId = req.tenant!.gymId;
      const userId = req.user!.id;

      const lead = await LeadService.addFollowUpNote(leadId, gymId!, userId, req.body.note);
      sendSuccess(res, lead, 'Follow-up note added successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  public static async convertLeadToMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { leadId } = req.params;
      const gymId = req.tenant!.gymId;
      const userId = req.user!.id;

      const result = await LeadService.convertLeadToMember(leadId, gymId!, req.body, userId);
      sendSuccess(res, result, 'Lead converted to member successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}
