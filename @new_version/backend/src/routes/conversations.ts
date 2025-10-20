import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { conversationsController } from '../controllers/ConversationsController';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// GET /api/conversations - Obtener todas las conversaciones
router.get('/', conversationsController.getAll.bind(conversationsController));

// GET /api/conversations/:id - Obtener conversación por ID
router.get('/:id', conversationsController.getById.bind(conversationsController));

// POST /api/conversations - Crear nueva conversación
router.post('/', conversationsController.create.bind(conversationsController));

// PUT /api/conversations/:id - Actualizar conversación
router.put('/:id', conversationsController.update.bind(conversationsController));

// DELETE /api/conversations/:id - Eliminar conversación
router.delete('/:id', conversationsController.delete.bind(conversationsController));

// POST /api/conversations/:id/assign - Asignar conversación
router.post('/:id/assign', conversationsController.assign.bind(conversationsController));

// PUT /api/conversations/:id/status - Actualizar estado de conversación
router.put('/:id/status', conversationsController.updateStatus.bind(conversationsController));

export default router;
