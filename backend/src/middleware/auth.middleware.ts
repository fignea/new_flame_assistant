import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.config';
import { JWTPayload } from '../types/auth.types';

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ 
      error: 'Token de acceso requerido',
      message: 'Debes proporcionar un token de autenticación'
    });
    return;
  }

  jwt.verify(token, jwtConfig.secret, (err: any, decoded: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ 
          error: 'Token expirado',
          message: 'El token de acceso ha expirado'
        });
        return;
      }
      if (err.name === 'JsonWebTokenError') {
        res.status(403).json({ 
          error: 'Token inválido',
          message: 'El token proporcionado no es válido'
        });
        return;
      }
      res.status(403).json({ 
        error: 'Error de autenticación',
        message: 'No se pudo verificar el token'
      });
      return;
    }

    req.user = decoded as JWTPayload;
    next();
  });
};

export const authenticateRefreshToken = (req: Request, res: Response, next: NextFunction) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(401).json({ 
      error: 'Refresh token requerido',
      message: 'Debes proporcionar un refresh token'
    });
    return;
  }

  jwt.verify(refreshToken, jwtConfig.refreshSecret, (err: any, decoded: any) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        res.status(401).json({ 
          error: 'Refresh token expirado',
          message: 'El refresh token ha expirado'
        });
        return;
      }
      res.status(403).json({ 
        error: 'Refresh token inválido',
        message: 'El refresh token proporcionado no es válido'
      });
      return;
    }

    req.user = decoded as JWTPayload;
    next();
  });
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ 
        error: 'No autenticado',
        message: 'Debes estar autenticado para acceder a este recurso'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'No tienes permisos para acceder a este recurso'
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['admin']);
export const requireUser = requireRole(['user', 'admin']);

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    next();
    return;
  }

  jwt.verify(token, jwtConfig.secret, (err: any, decoded: any) => {
    if (!err) {
      req.user = decoded as JWTPayload;
    }
    next();
  });
};
