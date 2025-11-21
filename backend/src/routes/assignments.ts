import { Router } from 'express';
import { AssignmentController } from '../controllers/AssignmentController';
import { authenticate } from '../middleware/auth';
import { assignmentValidation } from '../middleware/validation';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// Rutas de asignaciones
router.post('/', assignmentValidation, AssignmentController.assignAssistant);
router.get('/', AssignmentController.getUserAssignments);
router.get('/conversation/:conversationId/:platform', AssignmentController.getAssignedAssistant);
router.delete('/conversation/:conversationId/:platform', AssignmentController.unassignAssistant);
router.post('/auto-assign', assignmentValidation, AssignmentController.autoAssignAssistant);
router.get('/stats', AssignmentController.getAssignmentStats);
router.get('/assistant/:assistantId', AssignmentController.getConversationsByAssistant);
router.get('/check/:conversationId/:platform', AssignmentController.hasAssignedAssistant);

export default router;
