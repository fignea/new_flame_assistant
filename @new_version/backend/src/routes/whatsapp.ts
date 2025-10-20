import { Router } from 'express';
import { whatsappController } from '../controllers/WhatsAppController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Rutas de WhatsApp
router.get('/status', whatsappController.getStatus.bind(whatsappController));
router.post('/connect', whatsappController.connect.bind(whatsappController));
router.post('/disconnect', whatsappController.disconnect.bind(whatsappController));
router.get('/qr', whatsappController.getQR.bind(whatsappController));
router.post('/send-message', whatsappController.sendMessage.bind(whatsappController));
router.get('/webhooks', whatsappController.getWebhooks.bind(whatsappController));
router.post('/webhooks', whatsappController.setWebhooks.bind(whatsappController));

export default router;
