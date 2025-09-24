import { Router } from 'express';
import { whatsappController } from '../controllers/WhatsAppController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Ruta de prueba sin autenticación (ANTES del middleware)
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp routes working',
    timestamp: new Date().toISOString()
  });
});

// Aplicar autenticación a las rutas protegidas

// Gestión de sesión (con autenticación)
router.post('/session', authenticate, whatsappController.createSession.bind(whatsappController));
router.get('/qr', authenticate, whatsappController.getQRCode.bind(whatsappController));
router.get('/status', authenticate, whatsappController.getStatus.bind(whatsappController));
router.post('/disconnect', authenticate, whatsappController.disconnect.bind(whatsappController));
router.post('/reconnect', authenticate, whatsappController.forceReconnect.bind(whatsappController));

// Mensajes (con autenticación)
router.post('/send', authenticate, whatsappController.sendMessage.bind(whatsappController));
router.get('/messages/:contactId', authenticate, whatsappController.getMessages.bind(whatsappController));

// Chats y mensajes (con autenticación)
router.get('/chats', authenticate, whatsappController.getChats.bind(whatsappController));
router.get('/chats/:chatId/messages', authenticate, whatsappController.getChatMessages.bind(whatsappController));

// Contactos (con autenticación)
router.get('/contacts', authenticate, whatsappController.getContacts.bind(whatsappController));

// Estadísticas (con autenticación)
router.get('/stats', authenticate, whatsappController.getStats.bind(whatsappController));

export default router;
