import { Router } from 'express';
import { scheduledMessagesController } from '../controllers/ScheduledMessagesController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// CRUD de programación
router.post('/', scheduledMessagesController.create.bind(scheduledMessagesController));
router.get('/', scheduledMessagesController.getAll.bind(scheduledMessagesController));
router.get('/:id', scheduledMessagesController.getById.bind(scheduledMessagesController));
router.put('/:id', scheduledMessagesController.update.bind(scheduledMessagesController));
router.delete('/:id', scheduledMessagesController.delete.bind(scheduledMessagesController));

// Acciones especiales
router.post('/:id/cancel', scheduledMessagesController.cancel.bind(scheduledMessagesController));

export default router;
