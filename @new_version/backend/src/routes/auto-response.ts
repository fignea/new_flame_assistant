import { Router } from 'express';
import { AutoResponseController } from '../controllers/AutoResponseController';
import { authenticate } from '../middleware/auth';
import { autoResponseValidation } from '../middleware/validation';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// Rutas de respuestas automáticas
router.post('/process', autoResponseValidation, AutoResponseController.processIncomingMessage);
router.post('/send', autoResponseValidation, AutoResponseController.sendAutoResponse);
router.post('/process-web', AutoResponseController.processWebMessage);
router.get('/should-respond/:conversationId/:platform', AutoResponseController.shouldAutoRespond);
router.get('/stats', AutoResponseController.getAutoResponseStats);

export default router;
