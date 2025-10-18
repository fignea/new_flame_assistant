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

// Media (con autenticación)
router.get('/media/:messageId', authenticate, whatsappController.serveMedia.bind(whatsappController));

// Contactos (con autenticación)
router.get('/contacts', authenticate, whatsappController.getContacts.bind(whatsappController));
router.post('/contacts', authenticate, whatsappController.createContact.bind(whatsappController));
router.get('/contacts/data/:whatsappId', authenticate, whatsappController.getContactData.bind(whatsappController));
router.put('/contacts/name/:whatsappId', authenticate, whatsappController.updateContactName.bind(whatsappController));
router.get('/contacts/:id', authenticate, whatsappController.getContactById.bind(whatsappController));
router.put('/contacts/:id', authenticate, whatsappController.updateContact.bind(whatsappController));
router.post('/contacts/:id/block', authenticate, whatsappController.blockContact.bind(whatsappController));
router.post('/contacts/:id/unblock', authenticate, whatsappController.unblockContact.bind(whatsappController));
router.delete('/contacts/:id', authenticate, whatsappController.deleteContact.bind(whatsappController));

// Estadísticas (con autenticación)
router.get('/stats', authenticate, whatsappController.getStats.bind(whatsappController));
// Estadísticas de mensajes (ruta directa)
router.get("/messages/stats", authenticate, whatsappController.getMessageStats.bind(whatsappController));

export default router;
