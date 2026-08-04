import crypto from 'crypto';
import mongoose from 'mongoose';
import { User } from '../user/user.model';
import { RefreshToken } from './refreshToken.model';
import { IUser, Role } from '../user/user.types';
import { AppError } from '../../common/utils/AppError';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, TokenPayload } from '../../common/utils/generateTokens';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/notification.types';
import { notificationTemplates } from '../notification/notificationTemplates';
import { logger } from '../../config/logger';

import { Member } from '../member/member.model';

const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  public static async registerUser(
    input: Partial<IUser> & { referralCode?: string },
    ipAddress?: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const existing = await User.findOne({ email: input.email?.toLowerCase(), isDeleted: false });
    if (existing) {
      throw AppError.conflict('An active user account with this email address already exists');
    }

    let referredByMemberId: mongoose.Types.ObjectId | undefined;
    if (input.referralCode) {
      const referringMember = await Member.findOne({
        referralCode: input.referralCode.trim(),
        isDeleted: false,
      });
      if (referringMember) {
        referredByMemberId = referringMember._id;
        logger.info(`🔗 Registration referred by member [${referredByMemberId}]`);
      }
    }

    const user = new User({
      fullName: input.fullName,
      email: input.email?.toLowerCase(),
      phone: input.phone,
      password: input.password,
      role: input.role || Role.MEMBER,
      gymId: input.gymId,
      branchId: input.branchId,
      referredByMemberId,
      isActive: true,
    });

    await user.save();

    const tokenPayload: TokenPayload = {
      id: user._id.toString(),
      role: user.role,
      gymId: user.gymId?.toString(),
      branchId: user.branchId?.toString(),
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      createdByIp: ipAddress,
      revoked: false,
    });

    logger.info(`👤 User registered: [ID: ${user._id}] [Role: ${user.role}] [Email: ${user.email}]`);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  public static async loginUser(
    email: string,
    passwordAttempt: string,
    ipAddress?: string
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).select('+password');

    if (!user) {
      throw AppError.unauthorized('Invalid email or password credentials');
    }

    if (!user.isActive) {
      throw AppError.forbidden('Your account has been deactivated. Please contact support.');
    }

    // Account lock check
    if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
      throw AppError.unauthorized('Account is temporarily locked due to too many failed attempts. Try again later.');
    }

    const isMatch = await user.comparePassword(passwordAttempt);
    if (!isMatch) {
      // Increment failed attempts
      const MAX_ATTEMPTS = 5;
      const attempts = (user.failedLoginAttempts || 0) + 1;
      user.failedLoginAttempts = attempts;
      if (attempts >= MAX_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
      }
      await user.save();
      throw AppError.unauthorized('Invalid email or password credentials');
    }

    // Reset failed attempts on success
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
    }

    const tokenPayload: TokenPayload = {
      id: user._id.toString(),
      role: user.role,
      gymId: user.gymId?.toString(),
      branchId: user.branchId?.toString(),
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    await RefreshToken.create({
      userId: user._id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      createdByIp: ipAddress,
      revoked: false,
    });

    user.lastLoginAt = new Date();
    await user.save();

    logger.info(`🔓 User logged in: [ID: ${user._id}] [Role: ${user.role}]`);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  public static async refreshAccessToken(
    providedRefreshToken: string,
    ipAddress?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: TokenPayload;

    try {
      payload = verifyRefreshToken(providedRefreshToken);
    } catch (error) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const providedHash = hashToken(providedRefreshToken);
    const existingToken = await RefreshToken.findOne({ tokenHash: providedHash });

    // Theft/reuse detection: if token not found or already revoked -> revoke ALL sessions for user
    if (!existingToken || existingToken.revoked) {
      if (payload?.id) {
        await RefreshToken.updateMany({ userId: payload.id, revoked: false }, { revoked: true });
      }
      logger.warn(`🚨 Refresh token reuse/theft detected for User ID: ${payload?.id}`);
      throw AppError.unauthorized('Session invalidated due to suspicious activity. Please log in again.');
    }

    const user = await User.findOne({ _id: payload.id, isDeleted: false, isActive: true });
    if (!user) {
      throw AppError.unauthorized('Invalid or expired refresh token');
    }

    const tokenPayload: TokenPayload = {
      id: user._id.toString(),
      role: user.role,
      gymId: user.gymId?.toString(),
      branchId: user.branchId?.toString(),
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);
    const newHash = hashToken(newRefreshToken);

    // Rotate token: revoke old token and set replacedByTokenHash
    existingToken.revoked = true;
    existingToken.replacedByTokenHash = newHash;
    await existingToken.save();

    // Create new RefreshToken document
    await RefreshToken.create({
      userId: user._id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      createdByIp: ipAddress,
      revoked: false,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  public static async refreshSession(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    return this.refreshAccessToken(token);
  }

  public static async logoutUser(userIdOrToken: string): Promise<void> {
    const tokenHash = hashToken(userIdOrToken);
    const result = await RefreshToken.findOneAndUpdate({ tokenHash }, { revoked: true });

    if (!result) {
      // If passed a userId string instead of raw token
      await RefreshToken.updateMany({ userId: userIdOrToken, revoked: false }, { revoked: true });
    }
    logger.info('🔒 User session logged out');
  }

  public static async logoutAllSessions(userId: string): Promise<void> {
    await RefreshToken.updateMany({ userId, revoked: false }, { revoked: true });
    logger.info(`🔒 All sessions logged out for User ID: ${userId}`);
  }

  public static async getMe(userId: string): Promise<IUser> {
    const user = await User.findOne({ _id: userId, isDeleted: false });
    if (!user) throw AppError.notFound('User profile not found');
    return user;
  }

  public static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) throw AppError.notFound('User not found');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) throw AppError.badRequest('Current password provided is incorrect');

    user.password = newPassword;
    await user.save();

    // Revoke all sessions on password change
    await RefreshToken.updateMany({ userId, revoked: false }, { revoked: true });
  }

  public static async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false });
    if (!user) {
      return 'If a matching account exists, a password reset token has been generated.';
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const template = notificationTemplates[NotificationType.PASSWORD_RESET]();
    await NotificationService.sendToUser(
      user._id.toString(),
      user.gymId?.toString() || '000000000000000000000000',
      NotificationType.PASSWORD_RESET,
      template.title,
      template.body
    );

    logger.info(`🔑 Password reset token generated for User ID: ${user._id}`);
    return resetToken;
  }

  public static async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      isDeleted: false,
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) {
      throw AppError.badRequest('Password reset token is invalid or has expired');
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Revoke all active refresh tokens on password reset
    await RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true });

    logger.info(`🔐 Password reset successful for User ID: ${user._id}`);
  }
}
