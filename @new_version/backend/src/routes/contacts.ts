import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { contactsController } from '../controllers/ContactsController';

const router = Router();

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticate);

// GET /api/contacts - Obtener todos los contactos
router.get('/', contactsController.getAll.bind(contactsController));

// GET /api/contacts/search - Buscar contactos
router.get('/search', contactsController.search.bind(contactsController));

// GET /api/contacts/:id - Obtener contacto por ID
router.get('/:id', contactsController.getById.bind(contactsController));

// POST /api/contacts - Crear nuevo contacto
router.post('/', contactsController.create.bind(contactsController));

// PUT /api/contacts/:id - Actualizar contacto
router.put('/:id', contactsController.update.bind(contactsController));

// DELETE /api/contacts/:id - Eliminar contacto
router.delete('/:id', contactsController.delete.bind(contactsController));

// POST /api/contacts/:id/block - Bloquear contacto
router.post('/:id/block', contactsController.block.bind(contactsController));

// POST /api/contacts/:id/unblock - Desbloquear contacto
router.post('/:id/unblock', contactsController.unblock.bind(contactsController));

export default router;
