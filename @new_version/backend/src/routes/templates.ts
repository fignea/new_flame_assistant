import { Router } from 'express';
import { TemplateController } from '../controllers/TemplateController';
import { authenticate } from '../middleware/auth';
import { templateValidation } from '../middleware/validation';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// Rutas de plantillas
router.post('/', templateValidation, TemplateController.createTemplate);
router.get('/', TemplateController.getUserTemplates);
router.get('/:id', TemplateController.getTemplateById);
router.put('/:id', TemplateController.updateTemplate);
router.delete('/:id', TemplateController.deleteTemplate);
router.post('/search', TemplateController.searchTemplatesByKeywords);
router.get('/category/:category', TemplateController.getTemplatesByCategory);
router.post('/:id/duplicate', TemplateController.duplicateTemplate);
router.get('/stats', TemplateController.getTemplateStats);

export default router;
