import mongoose from 'mongoose';
import { Lead } from './lead.model';
import { ILead, LeadStatus } from './lead.types';
import { Member } from '../member/member.model';
import { MemberService } from '../member/member.service';
import { IMember } from '../member/member.types';
import { AppError } from '../../common/utils/AppError';
import { getPaginationParams, buildPaginationMeta, ParsedPagination } from '../../common/utils/pagination';

export interface CreateLeadInput {
  fullName: string;
  phone: string;
  email?: string;
  source?: string;
  referralCode?: string;
  status?: LeadStatus;
  trialDate?: Date;
}

export interface ConvertLeadInput {
  planName: string;
  membershipStartDate?: Date;
  membershipEndDate: Date;
  password?: string;
  assignedTrainerId?: string;
  emergencyContact?: { name: string; phone: string; relation: string };
  healthInfo?: { currentWeight_kg?: number; targetWeight_kg?: number; medicalNotes?: string; injuries?: string[] };
  fitnessGoals?: string[];
}

export class LeadService {
  public static async createLead(
    gymId: string,
    branchId: string,
    input: CreateLeadInput
  ): Promise<ILead> {
    const { referralCode, ...leadData } = input;
    let source = leadData.source;

    if (referralCode) {
      const referringMember = await Member.findOne({
        referralCode: referralCode.trim(),
        gymId: new mongoose.Types.ObjectId(gymId),
        isDeleted: false,
      });

      if (referringMember) {
        source = `REFERRAL:${referringMember._id.toString()}`;
      }
    }

    const lead = new Lead({
      gymId: new mongoose.Types.ObjectId(gymId),
      branchId: new mongoose.Types.ObjectId(branchId),
      ...leadData,
      source,
    });
    await lead.save();
    return lead;
  }

  public static async listLeads(
    gymId: string,
    branchId?: string,
    filters: { status?: LeadStatus; search?: string } = {},
    options: { page?: number | string; limit?: number | string } = {}
  ): Promise<{ leads: ILead[]; meta: ReturnType<typeof buildPaginationMeta> }> {
    const { page, limit, skip }: ParsedPagination = getPaginationParams(options);
    const gymObjectId = new mongoose.Types.ObjectId(gymId);
    const branchObjectId = branchId && mongoose.Types.ObjectId.isValid(branchId) ? new mongoose.Types.ObjectId(branchId) : new mongoose.Types.ObjectId("65a000000000000000000002");

    // Auto-seed sample leads if zero leads exist for gym in DB
    const existingCount = await Lead.countDocuments({ gymId: gymObjectId });
    if (existingCount === 0) {
      await Lead.insertMany([
        { gymId: gymObjectId, branchId: branchObjectId, fullName: "Rahul Sharma", phone: "+91 9876543210", email: "rahul.s@example.com", source: "Instagram Ad", status: LeadStatus.NEW },
        { gymId: gymObjectId, branchId: branchObjectId, fullName: "Ananya Patel", phone: "+91 9876543211", email: "ananya@example.com", source: "Website Inquiry", status: LeadStatus.CONTACTED },
        { gymId: gymObjectId, branchId: branchObjectId, fullName: "Sameer Khan", phone: "+91 9876543212", email: "sameer@example.com", source: "Walk-in", status: LeadStatus.TRIAL_SCHEDULED },
        { gymId: gymObjectId, branchId: branchObjectId, fullName: "Pooja Verma", phone: "+91 9876543213", email: "pooja@example.com", source: "Referral", status: LeadStatus.CONVERTED },
      ]);
    }

    const filter: Record<string, unknown> = {
      gymId: gymObjectId,
    };

    if (branchId && mongoose.Types.ObjectId.isValid(branchId)) {
      filter.branchId = new mongoose.Types.ObjectId(branchId);
    }
    if (filters.status) {
      filter.status = filters.status;
    }
    if (filters.search) {
      filter.$or = [
        { fullName: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [leads, totalItems] = await Promise.all([
      Lead.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Lead.countDocuments(filter),
    ]);

    const meta = buildPaginationMeta(totalItems, page, limit);

    return { leads, meta };
  }

  public static async updateLeadStatus(
    leadId: string,
    gymId: string,
    status: LeadStatus,
    trialDate?: Date
  ): Promise<ILead> {
    const updateData: Record<string, unknown> = { status };
    if (trialDate) updateData.trialDate = trialDate;

    const lead = await Lead.findOneAndUpdate(
      {
        _id: leadId,
        gymId: new mongoose.Types.ObjectId(gymId),
      },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!lead) {
      throw AppError.notFound('Lead not found');
    }

    return lead;
  }

  public static async addFollowUpNote(
    leadId: string,
    gymId: string,
    addedByUserId: string,
    noteText: string
  ): Promise<ILead> {
    const lead = await Lead.findOne({
      _id: leadId,
      gymId: new mongoose.Types.ObjectId(gymId),
    });

    if (!lead) {
      throw AppError.notFound('Lead not found');
    }

    lead.followUpNotes.push({
      note: noteText,
      addedByUserId: new mongoose.Types.ObjectId(addedByUserId),
      addedAt: new Date(),
    });

    await lead.save();
    return lead;
  }

  public static async convertLeadToMember(
    leadId: string,
    gymId: string,
    input: ConvertLeadInput,
    _actingUserId?: string
  ): Promise<{ lead: ILead; member: IMember }> {
    const lead = await Lead.findOne({
      _id: leadId,
      gymId: new mongoose.Types.ObjectId(gymId),
    });

    if (!lead) {
      throw AppError.notFound('Lead not found');
    }

    if (lead.status === LeadStatus.CONVERTED) {
      throw AppError.badRequest('This lead has already been converted to a member');
    }

    const emailToUse = lead.email || `${lead.phone.replace(/[^0-9]/g, '')}@lead.gymsaas.com`;

    let referredByMemberId: string | undefined;
    if (lead.source) {
      const match = lead.source.match(/^REFERRAL:([a-f0-9]{24})$/i);
      if (match) {
        referredByMemberId = match[1];
      }
    }

    const member = await MemberService.createMember(gymId, lead.branchId.toString(), {
      fullName: lead.fullName,
      email: emailToUse,
      phone: lead.phone,
      password: input.password || 'Member@123',
      branchId: lead.branchId.toString(),
      planName: input.planName,
      membershipStartDate: input.membershipStartDate || new Date(),
      membershipEndDate: input.membershipEndDate,
      referredByMemberId,
      assignedTrainerId: input.assignedTrainerId,
      emergencyContact: input.emergencyContact,
      healthInfo: input.healthInfo,
      fitnessGoals: input.fitnessGoals,
    });

    lead.status = LeadStatus.CONVERTED;
    lead.convertedMemberId = member._id;
    await lead.save();

    return { lead, member };
  }
}
