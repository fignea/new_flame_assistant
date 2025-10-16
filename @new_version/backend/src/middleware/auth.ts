import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, User, Tenant } from '../types';
import { database } from '../config/database';

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
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
      
      // Obtener usuario con información del tenant
      const user = await database.get(`
        SELECT 
          u.id, u.tenant_id, u.email, u.name, u.role, u.permissions, u.is_active,
          t.slug as tenant_slug, t.name as tenant_name, t.plan_type, t.limits, t.status as tenant_status
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.id = $1 AND u.is_active = TRUE AND t.deleted_at IS NULL
      `, [decoded.userId]) as any;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no válido o inactivo'
        });
      }

      // Verificar que el tenant esté activo
      if (user.tenant_status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Tenant suspendido o inactivo'
        });
      }

      // Configurar contexto del tenant en la base de datos
      await database.query('SET app.current_tenant_id = $1', [user.tenant_id]);
      await database.query('SET app.current_user_id = $1', [user.id]);

      // Agregar usuario y tenant al request
      req.user = {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || {}
      };

      req.tenant = {
        id: user.tenant_id,
        slug: user.tenant_slug,
        name: user.tenant_name,
        plan_type: user.plan_type,
        limits: user.limits || {}
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

export const generateToken = (user: User, tenant: Tenant): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    {
      userId: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      role: user.role
    },
    jwtSecret,
    {
      expiresIn: jwtExpiresIn
    } as jwt.SignOptions
  );
};

// Middleware para verificar roles específicos
export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
      });
    }

    next();
  };
};

// Middleware para verificar permisos específicos
export const requirePermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userPermissions = req.user.permissions || {};
    
    if (!userPermissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permiso requerido: ${permission}`
      });
    }

    next();
  };
};

// Middleware para verificar límites del tenant
export const checkTenantLimits = (resource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.tenant) {
      return res.status(401).json({
        success: false,
        message: 'Tenant no identificado'
      });
    }

    try {
      const limits = req.tenant.limits;
      let currentCount = 0;

      switch (resource) {
        case 'users':
          currentCount = await database.get(
            'SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND deleted_at IS NULL',
            [req.tenant.id]
          ).then((result: any) => result?.count || 0);
          break;
        case 'contacts':
          currentCount = await database.get(
            'SELECT COUNT(*) as count FROM contacts WHERE tenant_id = $1',
            [req.tenant.id]
          ).then((result: any) => result?.count || 0);
          break;
        case 'conversations':
          currentCount = await database.get(
            'SELECT COUNT(*) as count FROM conversations WHERE tenant_id = $1',
            [req.tenant.id]
          ).then((result: any) => result?.count || 0);
          break;
        case 'messages':
          currentCount = await database.get(
            'SELECT COUNT(*) as count FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.tenant_id = $1',
            [req.tenant.id]
          ).then((result: any) => result?.count || 0);
          break;
        default:
          return next();
      }

      const limit = limits[`max_${resource}`] || Infinity;
      
      if (currentCount >= limit) {
        return res.status(403).json({
          success: false,
          message: `Límite de ${resource} alcanzado para tu plan actual`
        });
      }

      next();
    } catch (error) {
      console.error('Error checking tenant limits:', error);
      next(); // Continuar si hay error en la verificación
    }
  };
};

// Middleware para verificar si el usuario es propietario del recurso
export const checkResourceOwnership = (resourceType: string, paramName: string = 'id') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.tenant) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const resourceId = req.params[paramName];
    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: 'ID del recurso requerido'
      });
    }

    try {
      let query = '';
      let params: any[] = [];

      switch (resourceType) {
        case 'contact':
          query = 'SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2';
          params = [resourceId, req.tenant.id];
          break;
        case 'conversation':
          query = 'SELECT id FROM conversations WHERE id = $1 AND tenant_id = $2';
          params = [resourceId, req.tenant.id];
          break;
        case 'assistant':
          query = 'SELECT id FROM assistants WHERE id = $1 AND tenant_id = $2';
          params = [resourceId, req.tenant.id];
          break;
        case 'message':
          query = `
            SELECT m.id FROM messages m 
            JOIN conversations c ON m.conversation_id = c.id 
            WHERE m.id = $1 AND c.tenant_id = $2
          `;
          params = [resourceId, req.tenant.id];
          break;
        default:
          return next();
      }

      const resource = await database.get(query, params);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado o no autorizado'
        });
      }

      next();
    } catch (error) {
      console.error('Error checking resource ownership:', error);
      return res.status(500).json({
        success: false,
        message: 'Error verificando permisos del recurso'
      });
    }
  };
};

// Middleware para logging de auditoría
export const auditLog = (action: string, resourceType: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const originalSend = res.json;
    
    res.json = function(data: any) {
      // Log de auditoría después de que la respuesta se envía
      if (req.user && req.tenant) {
        setImmediate(async () => {
          try {
            await database.run(`
              INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, new_values, ip_address, user_agent, created_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            `, [
              req.tenant!.id,
              req.user!.id,
              action,
              resourceType,
              req.params.id || null,
              JSON.stringify(data),
              req.ip,
              req.get('User-Agent')
            ]);
          } catch (error) {
            console.error('Error logging audit:', error);
          }
        });
      }
      
      return originalSend.call(this, data);
    };
    
    next();
  };
};