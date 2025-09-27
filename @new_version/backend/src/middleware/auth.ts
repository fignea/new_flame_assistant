import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, User } from '../types';
import { database } from '../config/database';

export interface JwtPayload {
  userId: number;
  email: string;
  organizationId?: number;
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
      
      // Verificar que el usuario existe y obtener su organización por defecto
      const userWithOrg = await database.get(
        `SELECT u.id, u.email, u.name, 
                COALESCE(or_role.organization_id, 1) as organization_id,
                or_role.role
         FROM users u
         LEFT JOIN organization_roles or_role ON u.id = or_role.user_id
         WHERE u.id = $1
         ORDER BY or_role.joined_at ASC
         LIMIT 1`,
        [decoded.userId]
      );

      if (!userWithOrg) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no válido'
        });
      }

      // Agregar usuario al request con información de organización
      req.user = {
        id: userWithOrg.id,
        email: userWithOrg.email,
        name: userWithOrg.name,
        organizationId: userWithOrg.organization_id,
        role: userWithOrg.role
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

// Alias para compatibilidad
export const authenticateToken = authenticate;
