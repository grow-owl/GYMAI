import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validate } from '../../common/middlewares/validate.middleware';
import { authenticate } from '../../common/middlewares/auth.middleware';
import { authLimiter } from '../../common/middlewares/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './auth.validation';

const router = Router();

// Public Auth Endpoints (Rate limited)
router.post('/register', authLimiter, validate(registerSchema, 'body'), AuthController.register);
router.post('/login', authLimiter, validate(loginSchema, 'body'), AuthController.login);
router.post('/refresh-token', validate(refreshTokenSchema, 'body'), AuthController.refreshToken);
router.post('/logout', AuthController.logout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema, 'body'), AuthController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema, 'body'), AuthController.resetPassword);

// Authenticated Endpoints
router.use(authenticate);
router.get('/me', AuthController.getMe);
router.post('/logout-all', AuthController.logoutAll);
router.patch('/change-password', validate(changePasswordSchema, 'body'), AuthController.changePassword);

export default router;
