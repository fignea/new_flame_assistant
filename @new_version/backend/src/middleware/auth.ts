import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, User } from '../types';
import { database } from '../config/database';

export interface JwtPayload {
  userId: number;
  email: string;
}

export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        message: 'Error de configuración del servidor'
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;
      
      // Verificar que el usuario existe
      const users = await database.all(
        'SELECT id, email, name FROM users WHERE id = $1',
        [decoded.userId]
      ) as User[];
      
      const user = users.length > 0 ? users[0] : null;

      if (!user) {
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

      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export const generateToken = (user: User): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      userId: user.id,
      email: user.email
    },
    jwtSecret,
    {
      expiresIn: jwtExpiresIn
    } as jwt.SignOptions
  );
};
