import { z } from 'zod';

export const createMemberSchema = z.object({
  fullName: z.string().min(2).max(100).trim(),
  email: z.string().email().toLowerCase().trim(),
  phone: z.string().min(5).trim(),
  password: z
    .string()
    .min(8)
    .regex(/(?=.*[a-zA-Z])(?=.*[0-9])/, 'Password must contain at least 1 letter and 1 number'),
  branchId: z.string().min(1, 'Branch ID is required'),
  assignedTrainerId: z.string().optional(),
  planName: z.string().min(1, 'Plan name is required').trim(),
  membershipStartDate: z.string().or(z.date()).transform((val) => new Date(val)),
  membershipEndDate: z.string().or(z.date()).transform((val) => new Date(val)),
  dateOfBirth: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  referralCode: z.string().trim().optional(),
  fitnessGoals: z.array(z.string().trim()).optional().default([]),
  emergencyContact: z
    .object({
      name: z.string().trim(),
      phone: z.string().trim(),
      relation: z.string().trim(),
    })
    .optional(),
  healthInfo: z
    .object({
      height_cm: z.number().positive().optional(),
      currentWeight_kg: z.number().positive().optional(),
      targetWeight_kg: z.number().positive().optional(),
      medicalConditions: z.array(z.string().trim()).optional(),
      injuries: z.array(z.string().trim()).optional(),
    })
    .optional(),
});

export const updateMemberSchema = z.object({
  planName: z.string().trim().optional(),
  membershipStatus: z.enum(['ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED']).optional(),
  dateOfBirth: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  referralCode: z.string().trim().optional(),
  fitnessGoals: z.array(z.string().trim()).optional(),
  emergencyContact: z
    .object({
      name: z.string().trim(),
      phone: z.string().trim(),
      relation: z.string().trim(),
    })
    .optional(),
  healthInfo: z
    .object({
      height_cm: z.number().positive().optional(),
      currentWeight_kg: z.number().positive().optional(),
      targetWeight_kg: z.number().positive().optional(),
      medicalConditions: z.array(z.string().trim()).optional(),
      injuries: z.array(z.string().trim()).optional(),
    })
    .optional(),
});

export const assignTrainerSchema = z.object({
  trainerId: z.string().min(1, 'Trainer ID is required'),
});

export const freezeMembershipSchema = z.object({
  freezeUntil: z.string().or(z.date()).transform((val) => new Date(val)),
  reason: z.string().trim().optional(),
});

export const renewMembershipSchema = z.object({
  newEndDate: z.string().or(z.date()).transform((val) => new Date(val)),
  planName: z.string().trim().optional(),
});
