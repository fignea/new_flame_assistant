import { Router } from 'express';
import { messagesController } from '../controllers/messages.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { body, param, query } from 'express-validator';
import multer from 'multer';

const router = Router();

// Configurar multer para manejo de archivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 16 * 1024 * 1024 // 16MB límite para archivos de WhatsApp
  },
  fileFilter: (req, file, cb) => {
    // Permitir todos los tipos de archivo que WhatsApp soporta
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/3gpp',
      'video/quicktime',
      'audio/mpeg',
      'audio/ogg',
      'audio/wav',
      'audio/aac',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no soportado') as any, false);
    }
  }
});

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Enviar mensaje de texto
router.post('/send',
  [
    body('to')
      .notEmpty()
      .withMessage('El destinatario es requerido')
      .isString()
      .withMessage('El destinatario debe ser una cadena')
      .matches(/^[0-9+\-\s()]+$/)
      .withMessage('El destinatario debe ser un número de teléfono válido'),
    body('message')
      .notEmpty()
      .withMessage('El mensaje es requerido')
      .isString()
      .withMessage('El mensaje debe ser una cadena')
      .isLength({ max: 4096 })
      .withMessage('El mensaje no puede exceder 4096 caracteres'),
    body('type')
      .optional()
      .isIn(['text', 'extendedText'])
      .withMessage('El tipo debe ser text o extendedText')
  ],
  validateRequest,
  messagesController.sendMessage
);

// Enviar mensaje con media
router.post('/send-media',
  upload.single('media'),
  [
    body('to')
      .notEmpty()
      .withMessage('El destinatario es requerido')
      .isString()
      .withMessage('El destinatario debe ser una cadena')
      .matches(/^[0-9+\-\s()]+$/)
      .withMessage('El destinatario debe ser un número de teléfono válido'),
    body('caption')
      .optional()
      .isString()
      .withMessage('El caption debe ser una cadena')
      .isLength({ max: 1024 })
      .withMessage('El caption no puede exceder 1024 caracteres'),
    body('mediaType')
      .optional()
      .isIn(['image', 'video', 'audio', 'document'])
      .withMessage('El tipo de media debe ser image, video, audio o document')
  ],
  validateRequest,
  messagesController.sendMediaMessage
);

// Obtener todos los chats
router.get('/chats',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser un número entre 1 y 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('El offset debe ser un número mayor o igual a 0')
  ],
  validateRequest,
  messagesController.getChats
);

// Obtener mensajes de un chat específico
router.get('/chats/:chatId/messages',
  [
    param('chatId')
      .notEmpty()
      .withMessage('El ID del chat es requerido')
      .isString()
      .withMessage('El ID del chat debe ser una cadena'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser un número entre 1 y 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('El offset debe ser un número mayor o igual a 0')
  ],
  validateRequest,
  messagesController.getMessages
);

// Marcar mensajes como leídos
router.post('/chats/:chatId/mark-read',
  [
    param('chatId')
      .notEmpty()
      .withMessage('El ID del chat es requerido')
      .isString()
      .withMessage('El ID del chat debe ser una cadena'),
    body('messageIds')
      .optional()
      .isArray()
      .withMessage('Los IDs de mensajes deben ser un array')
  ],
  validateRequest,
  messagesController.markAsRead
);

// Obtener mensajes recientes de todos los chats
router.get('/recent',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El límite debe ser un número entre 1 y 50')
  ],
  validateRequest,
  messagesController.getRecentMessages
);

// Buscar mensajes
router.get('/search',
  [
    query('query')
      .notEmpty()
      .withMessage('El término de búsqueda es requerido')
      .isString()
      .withMessage('El término de búsqueda debe ser una cadena')
      .isLength({ min: 2, max: 100 })
      .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres'),
    query('chatId')
      .optional()
      .isString()
      .withMessage('El ID del chat debe ser una cadena'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe ser un número entre 1 y 100')
  ],
  validateRequest,
  messagesController.searchMessages
);

// Obtener estadísticas de mensajes
router.get('/stats',
  messagesController.getMessageStats
);

// Configurar webhook para mensajes entrantes
router.post('/webhook',
  [
    body('webhookUrl')
      .notEmpty()
      .withMessage('La URL del webhook es requerida')
      .isURL()
      .withMessage('La URL del webhook debe ser una URL válida'),
    body('events')
      .optional()
      .isArray()
      .withMessage('Los eventos deben ser un array')
      .custom((value) => {
        const allowedEvents = ['message', 'messageUpdate', 'chat', 'presence'];
        if (value && !value.every((event: string) => allowedEvents.includes(event))) {
          throw new Error('Los eventos deben ser válidos');
        }
        return true;
      })
  ],
  validateRequest,
  messagesController.setupMessageWebhook
);

export default router;
