import { Router } from 'express';
import { configController } from '../controllers/ConfigController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Rutas de configuración
router.get('/profile', configController.getProfile);
router.put('/profile', configController.updateProfile);
router.put('/password', configController.changePassword);
router.get('/system-info', configController.getSystemInfo);
router.get('/database-status', configController.getDatabaseStatus);

export default router;
