import { database } from '../config/database';
import { logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import sharp from 'sharp';

export interface MediaFile {
  id: number;
  user_id: number;
  original_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_path?: string;
  is_compressed: boolean;
  compression_ratio?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMediaFileRequest {
  original_name: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail_path?: string;
  is_compressed?: boolean;
  compression_ratio?: number;
}

export class MediaService {
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads');
  private static readonly THUMBNAIL_DIR = path.join(process.cwd(), 'uploads', 'thumbnails');
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private static readonly ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
  private static readonly ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];

  // Inicializar directorios de upload
  static async initializeDirectories(): Promise<void> {
    try {
      if (!fs.existsSync(this.UPLOAD_DIR)) {
        fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
      }
      if (!fs.existsSync(this.THUMBNAIL_DIR)) {
        fs.mkdirSync(this.THUMBNAIL_DIR, { recursive: true });
      }
      logger.info('📁 Directorios de multimedia inicializados');
    } catch (error) {
      logger.error('Error inicializando directorios de multimedia:', error);
      throw error;
    }
  }

  // Validar tipo de archivo
  static validateFileType(mimeType: string): { isValid: boolean; category: string } {
    if (this.ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return { isValid: true, category: 'image' };
    }
    if (this.ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      return { isValid: true, category: 'video' };
    }
    if (this.ALLOWED_DOCUMENT_TYPES.includes(mimeType)) {
      return { isValid: true, category: 'document' };
    }
    return { isValid: false, category: 'unknown' };
  }

  // Generar nombre único para archivo
  static generateUniqueFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    const hash = crypto.randomBytes(16).toString('hex');
    return `${name}_${hash}${ext}`;
  }

  // Comprimir imagen
  static async compressImage(inputPath: string, outputPath: string, quality: number = 80): Promise<{ success: boolean; originalSize: number; compressedSize: number; ratio: number }> {
    try {
      const originalStats = fs.statSync(inputPath);
      const originalSize = originalStats.size;

      await sharp(inputPath)
        .jpeg({ quality })
        .png({ quality })
        .webp({ quality })
        .toFile(outputPath);

      const compressedStats = fs.statSync(outputPath);
      const compressedSize = compressedStats.size;
      const ratio = compressedSize / originalSize;

      return {
        success: true,
        originalSize,
        compressedSize,
        ratio
      };
    } catch (error) {
      logger.error('Error comprimiendo imagen:', error);
      throw error;
    }
  }

  // Generar thumbnail para imagen
  static async generateImageThumbnail(inputPath: string, outputPath: string, width: number = 300, height: number = 300): Promise<void> {
    try {
      await sharp(inputPath)
        .resize(width, height, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    } catch (error) {
      logger.error('Error generando thumbnail de imagen:', error);
      throw error;
    }
  }

  // Generar thumbnail para video (placeholder por ahora)
  static async generateVideoThumbnail(inputPath: string, outputPath: string): Promise<void> {
    try {
      // Por ahora, crear un thumbnail placeholder
      // En producción, usar ffmpeg para extraer frame del video
      const placeholderPath = path.join(__dirname, '../../assets/video-placeholder.jpg');
      if (fs.existsSync(placeholderPath)) {
        fs.copyFileSync(placeholderPath, outputPath);
      } else {
        // Crear un thumbnail simple con sharp
        await sharp({
          create: {
            width: 300,
            height: 200,
            channels: 3,
            background: { r: 100, g: 100, b: 100 }
          }
        })
        .jpeg()
        .toFile(outputPath);
      }
    } catch (error) {
      logger.error('Error generando thumbnail de video:', error);
      throw error;
    }
  }

  // Crear archivo multimedia en la base de datos
  static async createMediaFile(userId: number, mediaData: CreateMediaFileRequest): Promise<MediaFile> {
    try {
      const result = await database.run(
        `INSERT INTO media_files (user_id, original_name, file_name, file_path, file_type, file_size, mime_type, width, height, duration, thumbnail_path, is_compressed, compression_ratio, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
        [
          userId,
          mediaData.original_name,
          mediaData.file_name,
          mediaData.file_path,
          mediaData.file_type,
          mediaData.file_size,
          mediaData.mime_type,
          mediaData.width || null,
          mediaData.height || null,
          mediaData.duration || null,
          mediaData.thumbnail_path || null,
          mediaData.is_compressed || false,
          mediaData.compression_ratio || null
        ]
      );

      const newMediaFile = await database.get(
        'SELECT * FROM media_files WHERE id = $1',
        [result.id]
      );

      return newMediaFile as MediaFile;
    } catch (error) {
      logger.error('Error creando archivo multimedia:', error);
      throw error;
    }
  }

  // Obtener archivo multimedia por ID
  static async getMediaFileById(id: number, userId: number): Promise<MediaFile | null> {
    try {
      const result = await database.all(
        'SELECT * FROM media_files WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      return result.length > 0 ? result[0] as MediaFile : null;
    } catch (error) {
      logger.error('Error obteniendo archivo multimedia:', error);
      throw error;
    }
  }

  // Obtener archivos multimedia del usuario
  static async getUserMediaFiles(userId: number, fileType?: string, limit: number = 50, offset: number = 0): Promise<MediaFile[]> {
    try {
      let query = 'SELECT * FROM media_files WHERE user_id = $1';
      let params: any[] = [userId];

      if (fileType) {
        query += ' AND file_type = $2';
        params.push(fileType);
        query += ' ORDER BY created_at DESC LIMIT $3 OFFSET $4';
        params.push(limit, offset);
      } else {
        query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
        params.push(limit, offset);
      }

      const result = await database.all(query, params);
      return result as MediaFile[];
    } catch (error) {
      logger.error('Error obteniendo archivos multimedia del usuario:', error);
      throw error;
    }
  }

  // Eliminar archivo multimedia
  static async deleteMediaFile(id: number, userId: number): Promise<boolean> {
    try {
      const mediaFile = await this.getMediaFileById(id, userId);
      if (!mediaFile) {
        return false;
      }

      // Eliminar archivo físico
      if (fs.existsSync(mediaFile.file_path)) {
        fs.unlinkSync(mediaFile.file_path);
      }

      // Eliminar thumbnail si existe
      if (mediaFile.thumbnail_path && fs.existsSync(mediaFile.thumbnail_path)) {
        fs.unlinkSync(mediaFile.thumbnail_path);
      }

      // Eliminar de la base de datos
      await database.run(
        'DELETE FROM media_files WHERE id = $1 AND user_id = $2',
        [id, userId]
      );

      return true;
    } catch (error) {
      logger.error('Error eliminando archivo multimedia:', error);
      throw error;
    }
  }

  // Obtener estadísticas de archivos multimedia
  static async getMediaStats(userId: number): Promise<{
    total_files: number;
    total_size: number;
    files_by_type: { [key: string]: number };
    size_by_type: { [key: string]: number };
  }> {
    try {
      console.log('Getting media stats for user:', userId);
      const stats = await database.all(
        `SELECT 
           COUNT(*)::integer as total_files,
           COALESCE(SUM(file_size), 0)::bigint as total_size
         FROM media_files 
         WHERE user_id = $1`,
        [userId]
      );
      console.log('Stats query result:', stats);

      const typeStats = await database.all(
        `SELECT 
           file_type,
           COUNT(*)::integer as count,
           COALESCE(SUM(file_size), 0)::bigint as size
         FROM media_files 
         WHERE user_id = $1
         GROUP BY file_type`,
        [userId]
      );

      const filesByType: { [key: string]: number } = {};
      const sizeByType: { [key: string]: number } = {};

      typeStats.forEach((stat: any) => {
        filesByType[stat.file_type] = parseInt(stat.count);
        sizeByType[stat.file_type] = parseInt(stat.size);
      });

      const mainStats = stats.length > 0 ? stats[0] : { total_files: 0, total_size: 0 };

      return {
        total_files: parseInt(mainStats.total_files) || 0,
        total_size: parseInt(mainStats.total_size) || 0,
        files_by_type: filesByType,
        size_by_type: sizeByType
      };
    } catch (error) {
      logger.error('Error obteniendo estadísticas de multimedia:', error);
      throw error;
    }
  }
}
