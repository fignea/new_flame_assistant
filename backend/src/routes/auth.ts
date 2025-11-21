import { Router } from 'express';
import { authController } from '../controllers/AuthController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rutas públicas
router.post('/login', (req, res) => authController.login(req, res));
router.post('/register', (req, res) => authController.register(req, res));

// Rutas protegidas
router.get('/profile', authenticate, (req, res) => authController.getProfile(req, res));
router.put('/profile', authenticate, (req, res) => authController.updateProfile(req, res));

export default router;