import dotenv from 'dotenv';

dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'flame-assistant',
  audience: process.env.JWT_AUDIENCE || 'flame-assistant-users'
};

export const tokenConfig = {
  // Configuración para tokens de acceso
  accessToken: {
    secret: jwtConfig.secret,
    expiresIn: jwtConfig.expiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  },
  
  // Configuración para tokens de refresh
  refreshToken: {
    secret: jwtConfig.refreshSecret,
    expiresIn: jwtConfig.refreshExpiresIn,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience
  }
};

// Función para generar un secreto aleatorio (solo para desarrollo)
export const generateRandomSecret = (): string => {
  const crypto = require('crypto');
  return crypto.randomBytes(64).toString('hex');
};

// Validar configuración JWT
export const validateJwtConfig = (): boolean => {
  const requiredVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`⚠️  Variables de entorno JWT faltantes: ${missingVars.join(', ')}`);
    console.warn('⚠️  Usando valores por defecto (NO RECOMENDADO para producción)');
    return false;
  }
  
  return true;
};

export default jwtConfig;
