import { Router } from 'express';
import { assistantsController } from '../controllers/AssistantsController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Rutas de asistentes
router.post('/', (req, res) => assistantsController.create(req, res));
router.get('/', (req, res) => assistantsController.getAll(req, res));
router.get('/:id', (req, res) => assistantsController.getById(req, res));
router.put('/:id', (req, res) => assistantsController.update(req, res));
router.delete('/:id', (req, res) => assistantsController.delete(req, res));
router.get('/:id/stats', (req, res) => assistantsController.getStats(req, res));

export default router;