import { Router } from 'express';
import { organizationsController } from '../controllers/OrganizationsController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de organizaciones
router.post('/', organizationsController.createOrganization);
router.get('/', organizationsController.getUserOrganizations);
router.get('/:id', organizationsController.getOrganization);
router.put('/:id', organizationsController.updateOrganization);

// Rutas de usuarios en organizaciones
router.post('/:id/invite', organizationsController.inviteUser);
router.get('/:id/users', organizationsController.getOrganizationUsers);
router.put('/:id/users/:userId/role', organizationsController.updateUserRole);
router.delete('/:id/users/:userId', organizationsController.removeUser);

export default router;
