import { Router } from 'express';
import { assistantsController } from '../controllers/AssistantsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Rutas de asistentes
router.post('/', assistantsController.create);
router.get('/', assistantsController.getAll);
router.get('/:id', assistantsController.getById);
router.put('/:id', assistantsController.update);
router.delete('/:id', assistantsController.delete);
router.patch('/:id/toggle-status', assistantsController.toggleStatus);
router.get('/:id/stats', assistantsController.getStats);

// Nuevas rutas para funcionalidades avanzadas
router.get('/models', assistantsController.getAvailableModels);
router.post('/validate-key', assistantsController.validateApiKey);
router.get('/:id/usage', assistantsController.getUsageInfo);

export default router;
