import { Router } from 'express';
import { tagsController } from '../controllers/TagsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Rutas de tags
router.get('/', tagsController.getTags.bind(tagsController));
router.get('/:id', tagsController.getTag.bind(tagsController));
router.post('/', tagsController.createTag.bind(tagsController));
router.put('/:id', tagsController.updateTag.bind(tagsController));
router.delete('/:id', tagsController.deleteTag.bind(tagsController));
router.post('/:id/conversations/:conversationId', tagsController.addTagToConversation.bind(tagsController));
router.delete('/:id/conversations/:conversationId', tagsController.removeTagFromConversation.bind(tagsController));

export default router;