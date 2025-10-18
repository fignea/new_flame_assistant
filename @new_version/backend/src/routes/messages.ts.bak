import { Router } from 'express';
import { whatsappController } from '../controllers/WhatsAppController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Estadísticas de mensajes (con autenticación)
router.get('/stats', authenticate, whatsappController.getMessageStats.bind(whatsappController));

export default router;
