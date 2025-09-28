import { Router } from 'express';
import { TagController } from '../controllers/TagController';
import { authenticate } from '../middleware/auth';
import { tagValidation } from '../middleware/validation';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// Rutas de etiquetas
router.post('/', tagValidation, TagController.createTag);
router.get('/', TagController.getUserTags);
router.get('/stats', TagController.getTagStats);
router.get('/conversation/:conversationId/:platform', TagController.getConversationTags);
router.get('/contact/:contactId', TagController.getContactTags);
router.get('/:id', TagController.getTagById);
router.put('/:id', TagController.updateTag);
router.delete('/:id', TagController.deleteTag);

// Rutas de asignación de etiquetas
router.post('/:id/conversation', TagController.tagConversation);
router.post('/:id/contact', TagController.tagContact);
router.delete('/:id/conversation/:conversationId/:platform', TagController.untagConversation);
router.delete('/:id/contact/:contactId', TagController.untagContact);

// Rutas de búsqueda
router.get('/:id/conversations', TagController.getConversationsByTag);
router.get('/:id/contacts', TagController.getContactsByTag);

export default router;
