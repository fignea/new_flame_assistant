import { Router } from 'express';
import { ConversationsController } from '../controllers/conversations.controller';
import { 
  validateCreateConversation,
  validateUpdateConversation,
  validateSendMessage,
  validateUUID,
  validatePagination
} from '../middleware/validation.middleware';
import { 
  messageRateLimit,
  writeOperationRateLimit,
  authenticatedUserRateLimit
} from '../middleware/rateLimit.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const conversationsController = new ConversationsController();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas de conversaciones
router.post('/', 
  writeOperationRateLimit,
  validateCreateConversation,
  conversationsController.createConversation
);

router.get('/', 
  authenticatedUserRateLimit,
  validatePagination,
  conversationsController.getConversations
);

router.get('/search', 
  authenticatedUserRateLimit,
  validatePagination,
  conversationsController.searchConversations
);

router.get('/unread-count', 
  authenticatedUserRateLimit,
  conversationsController.getUnreadCount
);

router.get('/bulk-update', 
  writeOperationRateLimit,
  conversationsController.bulkUpdateConversations
);

router.get('/:id', 
  validateUUID,
  conversationsController.getConversationById
);

router.put('/:id', 
  writeOperationRateLimit,
  validateUUID,
  validateUpdateConversation,
  conversationsController.updateConversation
);

router.delete('/:id', 
  writeOperationRateLimit,
  validateUUID,
  conversationsController.deleteConversation
);

router.get('/:id/stats', 
  validateUUID,
  conversationsController.getConversationStats
);

// Rutas de mensajes
router.get('/:id/messages', 
  validateUUID,
  validatePagination,
  conversationsController.getMessages
);

router.post('/:id/messages', 
  messageRateLimit,
  validateUUID,
  validateSendMessage,
  conversationsController.sendMessage
);

router.put('/:id/mark-read', 
  writeOperationRateLimit,
  validateUUID,
  conversationsController.markAsRead
);

export default router;
