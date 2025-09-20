import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { 
  validateRegister, 
  validateLogin, 
  validateRefreshToken,
  validateForgotPassword,
  validateResetPassword 
} from '../middleware/validation.middleware';
import { 
  authRateLimit, 
  registerRateLimit, 
  passwordResetRateLimit 
} from '../middleware/rateLimit.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

// Rutas públicas
router.post('/register', 
  registerRateLimit,
  validateRegister,
  authController.register
);

router.post('/login', 
  authRateLimit,
  validateLogin,
  authController.login
);

router.post('/refresh-token', 
  validateRefreshToken,
  authController.refreshToken
);

router.post('/forgot-password', 
  passwordResetRateLimit,
  validateForgotPassword,
  authController.forgotPassword
);

router.post('/reset-password', 
  passwordResetRateLimit,
  validateResetPassword,
  authController.resetPassword
);

// Rutas protegidas
router.get('/me', 
  authenticateToken,
  authController.me
);

router.get('/profile', 
  authenticateToken,
  authController.getProfile
);

router.put('/profile', 
  authenticateToken,
  authController.updateProfile
);

router.post('/logout', 
  authenticateToken,
  authController.logout
);

export default router;
