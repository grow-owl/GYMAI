import { z } from 'zod';
import { LeadStatus } from './lead.types';

export const createLeadSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').trim(),
  phone: z.string().min(5, 'Valid phone number is required').trim(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  source: z.string().optional(),
  referralCode: z.string().trim().optional(),
  status: z.nativeEnum(LeadStatus).optional().default(LeadStatus.NEW),
  trialDate: z.string().datetime().or(z.date()).optional(),
});

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(LeadStatus),
  trialDate: z.string().datetime().or(z.date()).optional(),
});

export const addFollowUpNoteSchema = z.object({
  note: z.string().min(1, 'Note content is required').trim(),
});

export const convertLeadSchema = z.object({
  planName: z.string().min(1, 'Plan name is required'),
  membershipStartDate: z.string().datetime().or(z.date()).optional().default(() => new Date()),
  membershipEndDate: z.string().datetime().or(z.date()),
  password: z.string().optional(),
  assignedTrainerId: z.string().optional(),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relation: z.string(),
    })
    .optional(),
  healthInfo: z
    .object({
      currentWeight_kg: z.number().optional(),
      targetWeight_kg: z.number().optional(),
      medicalNotes: z.string().optional(),
      injuries: z.array(z.string()).optional(),
    })
    .optional(),
  fitnessGoals: z.array(z.string()).optional(),
});
