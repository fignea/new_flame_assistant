import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { usersController } from '../controllers/UsersController';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// GET /api/users - Obtener todos los usuarios
router.get('/', usersController.getAll.bind(usersController));

// GET /api/users/stats - Obtener estadísticas de usuarios
router.get('/stats', usersController.getStats.bind(usersController));

// GET /api/users/:id - Obtener usuario por ID
router.get('/:id', usersController.getById.bind(usersController));

// POST /api/users - Crear nuevo usuario
router.post('/', usersController.create.bind(usersController));

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', usersController.update.bind(usersController));

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', usersController.delete.bind(usersController));

// POST /api/users/:id/toggle-active - Activar/Desactivar usuario
router.post('/:id/toggle-active', usersController.toggleActive.bind(usersController));

// POST /api/users/:id/change-password - Cambiar contraseña
router.post('/:id/change-password', usersController.changePassword.bind(usersController));

export default router;

