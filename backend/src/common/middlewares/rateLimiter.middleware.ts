import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { env } from '../../config/env';
import { ApiResponse } from '../utils/ApiResponse';
import { ErrorCode } from '../constants/errorCodes.enum';

/**
 * Generic Rate Limiter Factory
 */
export const createRateLimiter = (
  windowMs: number,
  max: number,
  customMessage: string = 'Too many requests, please try again later.'
): RateLimitRequestHandler => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      return ApiResponse.error(res, ErrorCode.RATE_LIMITED, customMessage, 429);
    },
  });
};

/**
 * Global default API Rate Limiter
 */
export const defaultRateLimiter = createRateLimiter(
  env.RATE_LIMIT_WINDOW_MS,
  env.RATE_LIMIT_MAX,
  'Too many requests from this IP, please try again later.'
);

/**
 * Stricter Rate Limiter for Authentication endpoints
 */
export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  15, // 15 login/register attempts
  'Too many authentication requests, please try again after 15 minutes.'
);

/**
 * Dedicated Rate Limiter for AI endpoints
 */
export const aiLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 AI queries per minute
  'AI quota rate limit reached, please slow down your requests.'
);
