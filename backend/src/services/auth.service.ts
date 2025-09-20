import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/User';
import { jwtConfig } from '../config/jwt.config';
import { redisUtils } from '../config/redis.config';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UpdateProfileRequest 
} from '../types/auth.types';
import { CustomError, handleDatabaseError } from '../middleware/error.middleware';
import { logger, logAuth } from '../utils/logger';
import { generateResetToken, generateVerificationHash } from '../utils/helpers';

export class AuthService {
  constructor(private userModel: UserModel) {}

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.userModel.findByEmail(userData.email);
      if (existingUser) {
        throw new CustomError('El usuario ya existe con este email', 409);
      }

      // Crear nuevo usuario
      const user = await this.userModel.create({
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role: 'user'
      });

      // Generar tokens
      const tokens = await this.generateTokens(user);

      // Log del registro
      logAuth('register', user.id, user.email, true);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error: any) {
      logAuth('register', undefined, userData.email, false);
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      // Buscar usuario por email
      const user = await this.userModel.findByEmail(loginData.email);
      if (!user) {
        throw new CustomError('Credenciales inválidas', 401);
      }

      // Verificar contraseña
      const isValidPassword = await this.userModel.verifyPassword(user, loginData.password);
      if (!isValidPassword) {
        throw new CustomError('Credenciales inválidas', 401);
      }

      // Generar tokens
      const tokens = await this.generateTokens(user);

      // Almacenar refresh token en Redis
      await redisUtils.setex(
        `refresh_token:${user.id}`,
        tokens.refreshToken,
        7 * 24 * 60 * 60 // 7 días
      );

      // Log del login
      logAuth('login', user.id, user.email, true);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error: any) {
      logAuth('login', undefined, loginData.email, false);
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async refreshToken(refreshData: RefreshTokenRequest): Promise<{ accessToken: string }> {
    try {
      // Verificar el refresh token
      const decoded = jwt.verify(refreshData.refreshToken, jwtConfig.refreshSecret) as any;
      
      // Verificar que el refresh token esté en Redis
      const storedToken = await redisUtils.get(`refresh_token:${decoded.userId}`);
      if (!storedToken || storedToken !== refreshData.refreshToken) {
        throw new CustomError('Refresh token inválido', 401);
      }

      // Buscar usuario
      const user = await this.userModel.findById(decoded.userId);
      if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
      }

      // Generar nuevo access token
      const accessToken = this.generateAccessToken(user);

      // Log del refresh
      logAuth('refresh_token', user.id, user.email, true);

      return { accessToken };
    } catch (error: any) {
      logAuth('refresh_token', undefined, undefined, false);
      if (error instanceof CustomError) throw error;
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new CustomError('Refresh token inválido', 401);
      }
      throw handleDatabaseError(error);
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // Eliminar refresh token de Redis
      await redisUtils.del(`refresh_token:${userId}`);

      // Log del logout
      logAuth('logout', userId, undefined, true);
    } catch (error) {
      logger.error('Error during logout:', error);
      throw new CustomError('Error al cerrar sesión', 500);
    }
  }

  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    try {
      const user = await this.userModel.findByEmail(data.email);
      if (!user) {
        // No revelar si el usuario existe o no
        return;
      }

      // Generar token de recuperación
      const resetToken = generateResetToken();
      const tokenHash = generateVerificationHash(resetToken);

      // Almacenar token en Redis (válido por 1 hora)
      await redisUtils.setex(
        `reset_token:${tokenHash}`,
        JSON.stringify({
          userId: user.id,
          email: user.email,
          timestamp: Date.now()
        }),
        60 * 60 // 1 hora
      );

      // TODO: Enviar email con el token
      // await this.sendResetPasswordEmail(user.email, resetToken);

      // Log del forgot password
      logAuth('forgot_password', user.id, user.email, true);

      logger.info(`Reset password token generated for user ${user.id}`);
    } catch (error) {
      logger.error('Error in forgot password:', error);
      throw new CustomError('Error al procesar solicitud', 500);
    }
  }

  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    try {
      const tokenHash = generateVerificationHash(data.token);
      const tokenData = await redisUtils.get(`reset_token:${tokenHash}`);

      if (!tokenData) {
        throw new CustomError('Token de recuperación inválido o expirado', 400);
      }

      const { userId } = JSON.parse(tokenData);

      // Actualizar contraseña
      const success = await this.userModel.updatePassword(userId, data.newPassword);
      if (!success) {
        throw new CustomError('Error al actualizar contraseña', 500);
      }

      // Eliminar token usado
      await redisUtils.del(`reset_token:${tokenHash}`);

      // Log del reset password
      logAuth('reset_password', userId, undefined, true);

      logger.info(`Password reset successful for user ${userId}`);
    } catch (error) {
      if (error instanceof CustomError) throw error;
      logger.error('Error in reset password:', error);
      throw new CustomError('Error al restablecer contraseña', 500);
    }
  }

  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<AuthResponse> {
    try {
      const user = await this.userModel.update(userId, data);
      if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
      }

      // Generar nuevos tokens
      const tokens = await this.generateTokens(user);

      // Log del update profile
      logAuth('update_profile', userId, user.email, true);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      logAuth('update_profile', userId, undefined, false);
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  async getProfile(userId: string): Promise<any> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        updated_at: user.updated_at
      };
    } catch (error) {
      if (error instanceof CustomError) throw error;
      throw handleDatabaseError(error);
    }
  }

  private async generateTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, {
      expiresIn: jwtConfig.refreshExpiresIn
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  private generateAccessToken(user: any): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, jwtConfig.secret, {
      expiresIn: jwtConfig.expiresIn
    } as jwt.SignOptions);
  }
}
