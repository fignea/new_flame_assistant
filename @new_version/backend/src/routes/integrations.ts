import { Router } from 'express';
import { whatsappController } from '../controllers/WhatsAppController';
import { webController } from '../controllers/WebController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rutas públicas para el widget web (sin autenticación)
router.post('/web/conversations', webController.createConversation.bind(webController));
router.post('/web/messages', webController.sendMessage.bind(webController));
router.get('/web/conversations/:conversationId/messages', webController.getMessagesPublic.bind(webController));
router.get('/web/conversations/public/:publicId/messages', webController.getMessagesByPublicId.bind(webController));
router.get('/web/widget-script', webController.getWidgetScript.bind(webController));

// Aplicar autenticación a las rutas restantes
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

// Rutas de integración Web Chat (requieren autenticación)
router.get('/web/conversations', webController.getConversations.bind(webController));
router.post('/web/agent-messages', webController.sendAgentMessage.bind(webController));
router.put('/web/conversations/:conversationId', webController.updateConversation.bind(webController));
router.post('/web/conversations/:conversationId/read', webController.markMessagesAsRead.bind(webController));
router.get('/web/stats', webController.getStats.bind(webController));

export default router;
