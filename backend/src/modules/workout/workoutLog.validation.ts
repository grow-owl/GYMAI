import { z } from 'zod';

export const startWorkoutLogSchema = z.object({
  workoutPlanId: z.string().optional(),
  dayLabel: z.string().trim().optional(),
  attendanceId: z.string().optional(),
});

export const updateSetSchema = z.object({
  reps: z.number().int().positive('Reps must be a positive integer'),
  weightKg: z.number().positive().optional(),
  completed: z.boolean().optional().default(true),
});
