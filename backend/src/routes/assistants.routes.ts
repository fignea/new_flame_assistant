import { Router } from 'express';
import { AssistantsController } from '../controllers/assistants.controller';
import { 
  validateCreateAssistant,
  validateUpdateAssistant,
  validateUUID,
  validatePagination
} from '../middleware/validation.middleware';
import { 
  writeOperationRateLimit,
  authenticatedUserRateLimit
} from '../middleware/rateLimit.middleware';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const assistantsController = new AssistantsController();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// Rutas de asistentes
router.post('/', 
  writeOperationRateLimit,
  validateCreateAssistant,
  assistantsController.createAssistant
);

router.get('/', 
  authenticatedUserRateLimit,
  validatePagination,
  assistantsController.getAssistants
);

router.get('/search', 
  authenticatedUserRateLimit,
  validatePagination,
  assistantsController.searchAssistants
);

router.get('/:id', 
  validateUUID,
  assistantsController.getAssistantById
);

router.put('/:id', 
  writeOperationRateLimit,
  validateUUID,
  validateUpdateAssistant,
  assistantsController.updateAssistant
);

router.delete('/:id', 
  writeOperationRateLimit,
  validateUUID,
  assistantsController.deleteAssistant
);

router.post('/:id/train', 
  writeOperationRateLimit,
  validateUUID,
  assistantsController.trainAssistant
);

router.get('/:id/stats', 
  validateUUID,
  assistantsController.getAssistantStats
);

// Rutas de horarios
router.get('/:id/schedules', 
  validateUUID,
  assistantsController.getSchedules
);

router.post('/:id/schedules', 
  writeOperationRateLimit,
  validateUUID,
  assistantsController.createSchedule
);

router.put('/:id/schedules/:scheduleId', 
  writeOperationRateLimit,
  validateUUID,
  assistantsController.updateSchedule
);

router.delete('/:id/schedules/:scheduleId', 
  writeOperationRateLimit,
  validateUUID,
  assistantsController.deleteSchedule
);

export default router;
