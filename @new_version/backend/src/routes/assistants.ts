import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { assistantsController } from '../controllers/AssistantsController';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// GET /api/assistants - Obtener todos los asistentes
router.get('/', assistantsController.getAll.bind(assistantsController));

// GET /api/assistants/stats - Obtener estadísticas de asistentes
router.get('/stats', assistantsController.getStats.bind(assistantsController));

// GET /api/assistants/:id - Obtener asistente por ID
router.get('/:id', assistantsController.getById.bind(assistantsController));

// POST /api/assistants - Crear nuevo asistente
router.post('/', assistantsController.create.bind(assistantsController));

// PUT /api/assistants/:id - Actualizar asistente
router.put('/:id', assistantsController.update.bind(assistantsController));

// DELETE /api/assistants/:id - Eliminar asistente
router.delete('/:id', assistantsController.delete.bind(assistantsController));

// GET /api/assistants/:id/metrics - Obtener métricas del asistente
router.get('/:id/metrics', assistantsController.getMetrics.bind(assistantsController));

export default router;