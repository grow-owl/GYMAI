import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { Branch } from '../gym/branch.model';
import { Gym } from '../gym/gym.model';
import { Lead } from './lead.model';
import { LeadStatus } from './lead.types';
import { AppError } from '../../common/utils/AppError';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { authLimiter } from '../../common/middlewares/rateLimiter.middleware';
import { z } from 'zod';

export const publicLeadRouter = Router();

// Validation schema for public lead submissions
const publicLeadSchema = z.object({
  branchId: z.string().min(1, 'Branch ID is required'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  phone: z.string().min(8, 'Phone number must be at least 8 digits').max(15),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  fitnessGoal: z.string().max(200).optional().or(z.literal('')),
  preferredTiming: z.string().max(100).optional().or(z.literal('')),
});

/**
 * GET /api/v1/public/branches/:branchId
 * Fetches publicly shareable branch information and gym branding for member join/trial page
 */
publicLeadRouter.get('/branches/:branchId', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { branchId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    throw AppError.badRequest('Invalid branch ID format');
  }

  const branch = await Branch.findOne({ _id: branchId, isActive: true, isDeleted: false });
  if (!branch) {
    throw AppError.notFound('Gym branch not found or currently inactive');
  }

  const gym = await Gym.findOne({ _id: branch.gymId, isDeleted: false }).select('name logoUrl settings');
  if (!gym) {
    throw AppError.notFound('Associated gym organization not found');
  }

  const trialDays = gym.settings?.defaultTrialPassDays || 2;

  sendSuccess(
    res,
    {
      gym: {
        id: gym._id,
        name: gym.name,
        logoUrl: gym.logoUrl,
        defaultTrialPassDays: trialDays,
      },
      branch: {
        id: branch._id,
        name: branch.name,
        address: branch.address,
        contactPhone: branch.contactPhone,
      },
    },
    'Branch and gym details retrieved successfully'
  );
});

/**
 * POST /api/v1/public/leads
 * Allows prospective gym members to submit a trial pass request from the branded /join/:branchId link
 */
publicLeadRouter.post('/leads', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const validated = publicLeadSchema.parse(req.body);

  if (!mongoose.Types.ObjectId.isValid(validated.branchId)) {
    throw AppError.badRequest('Invalid branch ID format');
  }

  const branch = await Branch.findOne({ _id: validated.branchId, isActive: true, isDeleted: false });
  if (!branch) {
    throw AppError.notFound('Gym branch not found or currently inactive');
  }

  const gym = await Gym.findOne({ _id: branch.gymId, isDeleted: false });
  if (!gym) {
    throw AppError.notFound('Associated gym organization not found');
  }

  // Check if active lead already exists for this phone and branch
  let lead = await Lead.findOne({
    branchId: branch._id,
    phone: validated.phone.trim(),
    isDeleted: false,
  });

  const trialNote = `Trial Pass Request. Fitness Goal: ${validated.fitnessGoal || 'General Fitness'} | Preferred Timing: ${validated.preferredTiming || 'Flexible'}`;

  if (lead) {
    lead.followUpNotes.push({
      note: `Repeat inquiry: ${trialNote}`,
      addedByUserId: undefined as any,
      addedAt: new Date(),
    });
    await lead.save();
  } else {
    lead = new Lead({
      gymId: branch.gymId,
      branchId: branch._id,
      fullName: validated.fullName.trim(),
      phone: validated.phone.trim(),
      email: validated.email?.trim() || undefined,
      source: 'Public Join Link',
      status: LeadStatus.NEW,
      followUpNotes: [
        {
          note: trialNote,
          addedByUserId: undefined,
          addedAt: new Date(),
        },
      ],
    });
    await lead.save();
  }

  const trialDays = gym.settings?.defaultTrialPassDays || 2;

  sendSuccess(
    res,
    {
      leadId: lead._id,
      fullName: lead.fullName,
      gymName: gym.name,
      branchName: branch.name,
      trialDays,
    },
    `Congratulations! Your ${trialDays}-day free trial workout pass at ${gym.name} (${branch.name}) has been requested. The front desk will confirm your pass!`,
    201
  );
});
