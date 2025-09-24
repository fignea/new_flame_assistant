import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rutas públicas
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));

// Rutas protegidas
router.get('/profile', authenticate, authController.getProfile.bind(authController));
router.put('/profile', authenticate, authController.updateProfile.bind(authController));

export default router;
