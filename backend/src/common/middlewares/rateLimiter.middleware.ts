import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { env } from '../../config/env';
import { ApiResponse } from '../utils/ApiResponse';
import { ErrorCode } from '../constants/errorCodes.enum';

/**
 * Generic Rate Limiter Factory
 * @param windowMs Time window in milliseconds
 * @param max Maximum requests allowed per IP in the time window
 * @param customMessage Custom error message when limit is exceeded
 * @param skipInDev If true, bypasses rate limiting during local development (NODE_ENV=development)
 */
export const createRateLimiter = (
  windowMs: number,
  max: number,
  customMessage: string = 'Too many requests, please try again later.',
  skipInDev: boolean = true
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => {
      // Avoid locking out developers during development / local testing
      if (skipInDev && env.NODE_ENV === 'development') {
        return true;
      }
      return false;
    },
    handler: (_req, res) => {
      return ApiResponse.error(res, ErrorCode.RATE_LIMITED, customMessage, 429);
    },
  });
};

/**
 * Global default API Rate Limiter
 * Bypassed in development mode, and allows a generous 2,000 requests per 15 mins in production
 * so that SPA navigation and component refreshes never falsely lock out users.
 */
export const defaultRateLimiter = createRateLimiter(
  env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  env.RATE_LIMIT_MAX || 2000,
  'Too many requests from this IP, please try again later.',
  true
);

/**
 * Stricter Rate Limiter for Authentication endpoints (login, register, forgot-password, reset-password)
 * Allows up to 30 authentication attempts per 15 minutes in production.
 */
export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  30, // 30 login/register attempts
  'Too many authentication requests, please try again after 15 minutes.',
  true
);

/**
 * Dedicated Rate Limiter for AI endpoints
 * Allows up to 60 AI requests per minute in production.
 */
export const aiLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  60, // 60 requests per minute
  'AI quota rate limit reached, please slow down your requests.',
  true
);

