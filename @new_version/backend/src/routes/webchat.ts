import { Router } from 'express';
import { webchatController } from '../controllers/WebChatController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rutas públicas para web chat (sin autenticación)
router.post('/conversations', webchatController.createConversation.bind(webchatController));
router.post('/conversations/:id/messages', webchatController.sendMessage.bind(webchatController));
router.get('/conversations/:id', webchatController.getConversation.bind(webchatController));

// Rutas protegidas para administración
router.use(authenticate);
router.get('/conversations', webchatController.getWebChatConversations.bind(webchatController));
router.get('/stats', webchatController.getStats.bind(webchatController));
router.put('/conversations/:id', webchatController.updateConversation.bind(webchatController));
router.delete('/conversations/:id', webchatController.deleteConversation.bind(webchatController));
router.post('/conversations/:id/assign', webchatController.assignConversation.bind(webchatController));

export default router;
