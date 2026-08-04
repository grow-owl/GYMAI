import { z } from 'zod';
import { Role } from '../user/user.types';

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters')
    .trim(),
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  phone: z.string().min(5, 'Phone number must be at least 5 characters').trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-zA-Z])(?=.*[0-9])/, 'Password must contain at least 1 letter and 1 number'),
  role: z.enum([Role.GYM_OWNER, Role.MEMBER], {
    errorMap: () => ({
      message: 'Self-registration is only allowed for GYM_OWNER or MEMBER roles',
    }),
  }),
  gymId: z.string().optional(),
  branchId: z.string().optional(),
  referralCode: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(), // May be passed in cookie or body
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/(?=.*[a-zA-Z])(?=.*[0-9])/, 'Password must contain at least 1 letter and 1 number'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/(?=.*[a-zA-Z])(?=.*[0-9])/, 'Password must contain at least 1 letter and 1 number'),
});
