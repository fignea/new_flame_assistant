import { Router } from 'express';
import { whatsappController } from '../controllers/WhatsAppController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Rutas de integración de WhatsApp
router.post('/whatsapp/session', whatsappController.createSession.bind(whatsappController));
router.get('/whatsapp/qr', whatsappController.getQRCode.bind(whatsappController));
router.get('/whatsapp/status', whatsappController.getStatus.bind(whatsappController));
router.post('/whatsapp/disconnect', whatsappController.disconnect.bind(whatsappController));
router.post('/whatsapp/reconnect', whatsappController.forceReconnect.bind(whatsappController));

// Mensajes
router.post('/whatsapp/send', whatsappController.sendMessage.bind(whatsappController));
router.get('/whatsapp/messages/:contactId', whatsappController.getMessages.bind(whatsappController));

// Contactos
router.get('/whatsapp/contacts', whatsappController.getContacts.bind(whatsappController));
router.get('/whatsapp/contacts/:id', whatsappController.getContactById.bind(whatsappController));

// Estadísticas
router.get('/whatsapp/stats', whatsappController.getStats.bind(whatsappController));

export default router;
