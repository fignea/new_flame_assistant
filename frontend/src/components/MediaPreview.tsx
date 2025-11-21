import React, { useState, useRef } from 'react';
import { X, Download, Eye, Play, Pause, Volume2, VolumeX, Image, Video, FileText } from 'lucide-react';

interface MediaFile {
  id: number;
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

interface MediaPreviewProps {
  file: MediaFile;
  onClose?: () => void;
  onRemove?: () => void;
  showControls?: boolean;
  className?: string;
}

const MediaPreview: React.FC<MediaPreviewProps> = ({
  file,
  onClose,
  onRemove,
  showControls = true,
  className = ''
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(file.duration || 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileUrl = (file: MediaFile): string => {
    return `/api/media/${file.id}/file`;
  };

  const getThumbnailUrl = (file: MediaFile): string => {
    return `/api/media/${file.id}/thumbnail`;
  };

  const handlePlayPause = () => {
    if (file.file_type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (file.file_type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (file.file_type === 'video' && videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else if (file.file_type === 'audio' && audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (file.file_type === 'video' && videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    } else if (file.file_type === 'audio' && audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (file.file_type === 'video' && videoRef.current) {
      setDuration(videoRef.current.duration);
    } else if (file.file_type === 'audio' && audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (file.file_type === 'video' && videoRef.current) {
      videoRef.current.currentTime = newTime;
    } else if (file.file_type === 'audio' && audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = getFileUrl(file);
    link.download = file.original_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMediaContent = () => {
    switch (file.file_type) {
      case 'image':
        return (
          <div className="relative">
            <img
              src={getFileUrl(file)}
              alt={file.original_name}
              className="max-w-full max-h-96 object-contain rounded-lg"
              onError={(e) => {
                // Fallback a thumbnail si la imagen no carga
                if (file.thumbnail_path) {
                  (e.target as HTMLImageElement).src = getThumbnailUrl(file);
                }
              }}
            />
            {file.width && file.height && (
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {file.width} × {file.height}
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="relative">
            <video
              ref={videoRef}
              src={getFileUrl(file)}
              poster={file.thumbnail_path ? getThumbnailUrl(file) : undefined}
              className="max-w-full max-h-96 rounded-lg"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            />
            {file.width && file.height && (
              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {file.width} × {file.height}
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Volume2 className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {file.original_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(file.file_size)}
              {file.duration && ` • ${formatTime(file.duration)}`}
            </p>
            <audio
              ref={audioRef}
              src={getFileUrl(file)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </div>
        );

      default:
        return (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-500" />
            </div>
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              {file.original_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(file.file_size)}
            </p>
          </div>
        );
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="text-purple-500">
            {file.file_type === 'image' && <Image className="w-5 h-5" />}
            {file.file_type === 'video' && <Video className="w-5 h-5" />}
            {file.file_type === 'audio' && <Volume2 className="w-5 h-5" />}
            {file.file_type === 'document' && <FileText className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {file.original_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(file.file_size)}
              {file.is_compressed && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  • Comprimido ({Math.round((file.compression_ratio || 1) * 100)}%)
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showControls && (
            <>
              <button
                onClick={handleDownload}
                className="p-2 text-gray-400 hover:text-purple-500 transition-colors"
                title="Descargar"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Media Content */}
      <div className="p-4">
        {renderMediaContent()}
      </div>

      {/* Controls para video/audio */}
      {(file.file_type === 'video' || file.file_type === 'audio') && showControls && (
        <div className="px-4 pb-4 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={handlePlayPause}
              className="p-2 bg-purple-500 text-white rounded-full hover:bg-purple-600 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleMuteToggle}
              className="p-2 text-gray-400 hover:text-purple-500 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPreview;
