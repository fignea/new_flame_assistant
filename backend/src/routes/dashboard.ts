import { Router } from 'express';
import { dashboardController } from '../controllers/DashboardController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Obtener estadísticas del dashboard (con autenticación)
router.get('/stats', authenticate, dashboardController.getStats.bind(dashboardController));

export default router;
