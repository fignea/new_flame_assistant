import { Router } from 'express';
import { MediaController } from '../controllers/MediaController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticate);

// Upload de archivo multimedia
router.post('/upload', MediaController.uploadMedia);

// Obtener estadísticas de multimedia
router.get('/stats', MediaController.getMediaStats);

// Obtener archivos multimedia del usuario
router.get('/', MediaController.getUserMediaFiles);

// Servir archivo multimedia
router.get('/:id/file', MediaController.serveMediaFile);

// Servir thumbnail
router.get('/:id/thumbnail', MediaController.serveThumbnail);

// Obtener archivo multimedia por ID
router.get('/:id', MediaController.getMediaFile);

// Eliminar archivo multimedia
router.delete('/:id', MediaController.deleteMediaFile);

export default router;
