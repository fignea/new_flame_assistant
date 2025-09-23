import { Router } from 'express';
import { integrationController } from '../controllers/integration.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';
import multer from 'multer';

const router = Router();

// Configurar multer para manejo de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  }
});

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Endpoint de prueba
router.get('/test', integrationController.testWhatsAppService);

// Rutas de gestión de sesiones persistentes
router.get('/sessions/stats', integrationController.getSessionStats);
router.post('/sessions/cleanup', integrationController.cleanupExpiredSessions);

// Obtener todas las integraciones
router.get('/', integrationController.getIntegrations);

// WhatsApp Web routes
router.post('/whatsapp/session', integrationController.createWhatsAppSession);
router.get('/whatsapp/qr', integrationController.getWhatsAppQR);
router.get('/whatsapp/status', integrationController.getWhatsAppStatus);
router.post('/whatsapp/disconnect', integrationController.disconnectWhatsApp);
router.post('/whatsapp/reconnect', integrationController.forceReconnectWhatsApp);

// Enviar mensaje de WhatsApp
router.post('/whatsapp/send', 
  [
    body('to')
      .notEmpty()
      .withMessage('El destinatario es requerido')
      .isString()
      .withMessage('El destinatario debe ser una cadena'),
    body('message')
      .notEmpty()
      .withMessage('El mensaje es requerido')
      .isString()
      .withMessage('El mensaje debe ser una cadena')
  ],
  validateRequest,
  integrationController.sendWhatsAppMessage
);

// Obtener chats de WhatsApp
router.get('/whatsapp/chats', integrationController.getWhatsAppChats);

// Obtener mensajes de un chat específico
router.get('/whatsapp/chats/:chatId/messages',
  [
    param('chatId')
      .notEmpty()
      .withMessage('El ID del chat es requerido'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser un número entre 1 y 100')
  ],
  validateRequest,
  integrationController.getWhatsAppMessages
);

// Enviar mensaje con validación y soporte para media
router.post('/whatsapp/send-with-validation', 
  upload.single('media'),
  [
    body('to')
      .notEmpty()
      .withMessage('El destinatario es requerido')
      .isString()
      .withMessage('El destinatario debe ser una cadena'),
    body('message')
      .notEmpty()
      .withMessage('El mensaje es requerido')
      .isString()
      .withMessage('El mensaje debe ser una cadena'),
    body('type')
      .optional()
      .isIn(['text', 'media'])
      .withMessage('El tipo debe ser text o media')
  ],
  validateRequest,
  integrationController.sendWhatsAppMessageWithValidation
);

// Obtener mensajes recientes de todos los chats
router.get('/whatsapp/recent-messages',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 200 })
      .withMessage('El límite debe ser un número entre 1 y 200')
  ],
  validateRequest,
  integrationController.getRecentMessages
);

// Marcar mensajes como leídos
router.post('/whatsapp/mark-read/:chatId',
  [
    param('chatId')
      .notEmpty()
      .withMessage('El ID del chat es requerido')
  ],
  validateRequest,
  integrationController.markMessagesAsRead
);

export default router;
