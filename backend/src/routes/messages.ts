import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { messagesController } from '../controllers/MessagesController';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// GET /api/messages - Obtener todos los mensajes
router.get('/', messagesController.getAll.bind(messagesController));

// GET /api/messages/conversation/:conversationId - Obtener mensajes por conversación
router.get('/conversation/:conversationId', messagesController.getByConversation.bind(messagesController));

// GET /api/messages/:id - Obtener mensaje por ID
router.get('/:id', messagesController.getById.bind(messagesController));

// POST /api/messages - Crear nuevo mensaje
router.post('/', messagesController.create.bind(messagesController));

// PUT /api/messages/:id - Actualizar mensaje
router.put('/:id', messagesController.update.bind(messagesController));

// DELETE /api/messages/:id - Eliminar mensaje
router.delete('/:id', messagesController.delete.bind(messagesController));

export default router;
