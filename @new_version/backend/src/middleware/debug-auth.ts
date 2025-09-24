import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, User } from '../types';
import { database } from '../config/database';
import { logger } from '../utils/logger';

export interface JwtPayload {
  userId: number;
  email: string;
}

export const debugAuthenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    console.log('Debug Auth - Headers:', { authHeader });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.info('Debug Auth - No token provided');
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    
    console.log('Debug Auth - Token:', { token: token.substring(0, 20) + '...', jwtSecret: jwtSecret?.substring(0, 10) + '...' });
    
    if (!jwtSecret) {
      console.log('Debug Auth - JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Error de configuración del servidor'
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      console.log('Debug Auth - Token decoded:', decoded);
      
      // Verificar que el usuario existe
      const user = await database.get(
        'SELECT id, email, name FROM users WHERE id = $1',
        [decoded.userId]
      ) as User;

      console.log('Debug Auth - User found:', { user });

      if (!user) {
        logger.info('Debug Auth - User not found');
        return res.status(401).json({
          success: false,
          message: 'Usuario no válido'
        });
      }

      // Agregar usuario al request
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name
      };

      logger.info('Debug Auth - Success, user added to request');
      next();
    } catch (jwtError) {
      logger.error('Debug Auth - JWT Error:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    logger.error('Debug Auth - General error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};
