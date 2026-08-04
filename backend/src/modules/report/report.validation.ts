import { z } from 'zod';

export const generateReportSchema = z.object({
  reportType: z.enum([
    'attendance',
    'workout_completion',
    'weight_change',
    'strength_growth',
    'ai_summary',
    'trainer_feedback',
    'revenue',
    'member_full_progress',
  ]),
  scope: z
    .object({
      branchId: z.string().optional(),
      memberId: z.string().optional(),
    })
    .optional(),
  periodStart: z.string().or(z.date()).transform((val) => new Date(val)),
  periodEnd: z.string().or(z.date()).transform((val) => new Date(val)),
  format: z.enum(['json', 'pdf']).optional().default('json'),
});
