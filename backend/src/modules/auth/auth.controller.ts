import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess } from '../../common/utils/ApiResponse';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { env } from '../../config/env';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const setRefreshTokenCookie = (res: Response, token: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE,
  });
};

const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/v1/auth',
  });
};

export class AuthController {
  public static register = asyncHandler(async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await AuthService.registerUser(req.body);

    setRefreshTokenCookie(res, refreshToken);

    const safeUser = user.toSafeJSON ? user.toSafeJSON() : user;
    return sendSuccess(res, { user: safeUser, accessToken }, 'User identity registered successfully', 201);
  });

  public static login = asyncHandler(async (req: Request, res: Response) => {
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const { user, accessToken, refreshToken } = await AuthService.loginUser(
      req.body.email,
      req.body.password,
      ipAddress
    );

    setRefreshTokenCookie(res, refreshToken);

    const safeUser = user.toSafeJSON ? user.toSafeJSON() : user;
    return sendSuccess(
      res,
      { user: safeUser, accessToken },
      'User authenticated successfully',
      200
    );
  });

  public static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const { accessToken, refreshToken: newRefreshToken } =
      await AuthService.refreshAccessToken(token, ipAddress);

    setRefreshTokenCookie(res, newRefreshToken);

    return sendSuccess(res, { accessToken }, 'Access token refreshed successfully', 200);
  });

  public static logout = asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      await AuthService.logoutUser(token);
    }
    clearRefreshTokenCookie(res);
    return sendSuccess(res, null, 'Logged out successfully', 200);
  });

  public static logoutAll = asyncHandler(async (req: Request, res: Response) => {
    if (req.user?.id) {
      await AuthService.logoutAllSessions(req.user.id);
    }
    clearRefreshTokenCookie(res);
    return sendSuccess(res, null, 'Logged out from all active sessions', 200);
  });

  public static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const message = await AuthService.forgotPassword(req.body.email);
    return sendSuccess(res, null, message, 200);
  });

  public static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    await AuthService.resetPassword(req.body.token, req.body.newPassword);
    return sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.', 200);
  });

  public static changePassword = asyncHandler(async (req: Request, res: Response) => {
    await AuthService.changePassword(
      req.user!.id,
      req.body.currentPassword,
      req.body.newPassword
    );
    clearRefreshTokenCookie(res);
    return sendSuccess(res, null, 'Password changed successfully. Please log in again.', 200);
  });

  public static getMe = asyncHandler(async (req: Request, res: Response) => {
    const user = await AuthService.getMe(req.user!.id);
    const safeUser = user.toSafeJSON ? user.toSafeJSON() : user;
    return sendSuccess(res, { user: safeUser }, 'User profile retrieved successfully', 200);
  });
}
