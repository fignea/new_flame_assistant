import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { MediaService, CreateMediaFileRequest } from '../services/MediaService';
import { logger } from '../utils/logger';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';

// Configurar multer para upload de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = MediaService.generateUniqueFileName(file.originalname);
    cb(null, uniqueName);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const validation = MediaService.validateFileType(file.mimetype);
  if (validation.isValid) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

export class MediaController {
  // Upload de archivo multimedia
  public static async uploadMedia(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo'
        });
      }

      const file = req.file;
      const validation = MediaService.validateFileType(file.mimetype);
      
      if (!validation.isValid) {
        // Eliminar archivo si no es válido
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: `Tipo de archivo no permitido: ${file.mimetype}`
        });
      }

      let mediaData: CreateMediaFileRequest = {
        original_name: file.originalname,
        file_name: file.filename,
        file_path: file.path,
        file_type: validation.category,
        file_size: file.size,
        mime_type: file.mimetype
      };

      // Procesar según el tipo de archivo
      if (validation.category === 'image') {
        try {
          // Obtener dimensiones de la imagen
          const imageInfo = await require('sharp')(file.path).metadata();
          mediaData.width = imageInfo.width;
          mediaData.height = imageInfo.height;

          // Comprimir imagen si es muy grande
          if (file.size > 5 * 1024 * 1024) { // 5MB
            const compressedPath = file.path.replace(/\.[^/.]+$/, '_compressed.jpg');
            const compressionResult = await MediaService.compressImage(file.path, compressedPath, 80);
            
            if (compressionResult.success) {
              // Reemplazar archivo original con comprimido
              fs.unlinkSync(file.path);
              fs.renameSync(compressedPath, file.path);
              
              mediaData.file_size = compressionResult.compressedSize;
              mediaData.is_compressed = true;
              mediaData.compression_ratio = compressionResult.ratio;
            }
          }

          // Generar thumbnail
          const thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails', `thumb_${file.filename}`);
          await MediaService.generateImageThumbnail(file.path, thumbnailPath);
          mediaData.thumbnail_path = thumbnailPath;

        } catch (error) {
          logger.error('Error procesando imagen:', error);
          // Continuar sin compresión si hay error
        }
      } else if (validation.category === 'video') {
        // Generar thumbnail para video
        const thumbnailPath = path.join(process.cwd(), 'uploads', 'thumbnails', `thumb_${file.filename.replace(/\.[^/.]+$/, '.jpg')}`);
        await MediaService.generateVideoThumbnail(file.path, thumbnailPath);
        mediaData.thumbnail_path = thumbnailPath;
      }

      // Guardar en base de datos
      const mediaFile = await MediaService.createMediaFile(req.tenant?.id || '', mediaData);

      res.status(201).json({
        success: true,
        data: mediaFile,
        message: 'Archivo multimedia subido exitosamente'
      });

    } catch (error) {
      logger.error('Error en upload de multimedia:', error);
      
      // Limpiar archivo si hay error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: 'Error al subir archivo multimedia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener archivo multimedia por ID
  public static async getMediaFile(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const mediaFile = await MediaService.getMediaFileById(id, req.tenant?.id || '');
      
      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Archivo multimedia no encontrado'
        });
      }

      res.json({
        success: true,
        data: mediaFile,
        message: 'Archivo multimedia obtenido exitosamente'
      });

    } catch (error) {
      logger.error('Error obteniendo archivo multimedia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener archivo multimedia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener archivos multimedia del usuario
  public static async getUserMediaFiles(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { type, limit = '50', offset = '0' } = req.query;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const mediaFiles = await MediaService.getUserMediaFiles(
        req.tenant?.id || '',
        type as string,
        parseInt(limit as string) || 50,
        parseInt(offset as string) || 0
      );

      res.json({
        success: true,
        data: mediaFiles,
        message: 'Archivos multimedia obtenidos exitosamente'
      });

    } catch (error) {
      logger.error('Error obteniendo archivos multimedia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener archivos multimedia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Servir archivo multimedia
  public static async serveMediaFile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const mediaFile = await MediaService.getMediaFileById(id, req.tenant?.id || '');
      
      if (!mediaFile) {
        return res.status(404).json({
          success: false,
          message: 'Archivo multimedia no encontrado'
        });
      }

      if (!fs.existsSync(mediaFile.file_path)) {
        return res.status(404).json({
          success: false,
          message: 'Archivo físico no encontrado'
        });
      }

      // Establecer headers apropiados
      res.setHeader('Content-Type', mediaFile.mime_type);
      res.setHeader('Content-Length', mediaFile.file_size);
      res.setHeader('Content-Disposition', `inline; filename="${mediaFile.original_name}"`);

      // Enviar archivo
      res.sendFile(path.resolve(mediaFile.file_path));

    } catch (error) {
      logger.error('Error sirviendo archivo multimedia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al servir archivo multimedia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Servir thumbnail
  public static async serveThumbnail(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const mediaFile = await MediaService.getMediaFileById(id, req.tenant?.id || '');
      
      if (!mediaFile || !mediaFile.thumbnail_path) {
        return res.status(404).json({
          success: false,
          message: 'Thumbnail no encontrado'
        });
      }

      if (!fs.existsSync(mediaFile.thumbnail_path)) {
        return res.status(404).json({
          success: false,
          message: 'Thumbnail físico no encontrado'
        });
      }

      // Establecer headers apropiados
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Disposition', `inline; filename="thumb_${mediaFile.original_name}"`);

      // Enviar thumbnail
      res.sendFile(path.resolve(mediaFile.thumbnail_path));

    } catch (error) {
      logger.error('Error sirviendo thumbnail:', error);
      res.status(500).json({
        success: false,
        message: 'Error al servir thumbnail',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Eliminar archivo multimedia
  public static async deleteMediaFile(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const deleted = await MediaService.deleteMediaFile(id, req.tenant?.id || '');
      
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Archivo multimedia no encontrado'
        });
      }

      res.json({
        success: true,
        message: 'Archivo multimedia eliminado exitosamente'
      });

    } catch (error) {
      logger.error('Error eliminando archivo multimedia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar archivo multimedia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  // Obtener estadísticas de multimedia
  public static async getMediaStats(req: AuthenticatedRequest, res: Response<ApiResponse>) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      const stats = await MediaService.getMediaStats(req.tenant?.id || '');

      res.json({
        success: true,
        data: stats,
        message: 'Estadísticas de multimedia obtenidas exitosamente'
      });

    } catch (error) {
      logger.error('Error obteniendo estadísticas de multimedia:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de multimedia',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }
}
