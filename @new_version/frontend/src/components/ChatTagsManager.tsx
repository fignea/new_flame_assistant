import React, { useState, useEffect } from 'react';
import { Tag, X, Plus, Check } from 'lucide-react';
import { apiService } from '../services/api.service';

interface ChatTagsManagerProps {
  conversationId: string;
  currentTags: string[];
  onTagsChange: (tags: string[]) => void;
  isWebConversation?: boolean;
}

interface Tag {
  id: number;
  name: string;
  color: string;
  description?: string;
}

const ChatTagsManager: React.FC<ChatTagsManagerProps> = ({
  conversationId,
  currentTags,
  onTagsChange,
  isWebConversation = false
}) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Cargar tags disponibles
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await apiService.getTags();
        if (response.success && response.data) {
          setAvailableTags(response.data);
        }
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };

    loadTags();
  }, []);

  // Obtener tags que no están asignados
  const unassignedTags = availableTags.filter(tag => 
    !currentTags.includes(tag.name)
  );

  // Agregar tag a la conversación
  const handleAddTag = async (tagId: number) => {
    setLoading(true);
    try {
      const tag = availableTags.find(t => t.id === tagId);
      if (!tag) return;

      if (isWebConversation) {
        // Para conversaciones web, usar el endpoint de conversation_tags
        const response = await apiService.addConversationTag(conversationId, tagId, 'web');
        if (response.success) {
          onTagsChange([...currentTags, tag.name]);
        }
      } else {
        // Para conversaciones de WhatsApp, usar contact_tags
        const response = await apiService.addContactTag(conversationId, tagId);
        if (response.success) {
          onTagsChange([...currentTags, tag.name]);
        }
      }
    } catch (error) {
      console.error('Error adding tag:', error);
    } finally {
      setLoading(false);
      setIsAddingTag(false);
      setSelectedTagId(null);
    }
  };

  // Eliminar tag de la conversación
  const handleRemoveTag = async (tagName: string) => {
    setLoading(true);
    try {
      const tag = availableTags.find(t => t.name === tagName);
      if (!tag) return;

      if (isWebConversation) {
        const response = await apiService.removeConversationTag(conversationId, tag.id, 'web');
        if (response.success) {
          onTagsChange(currentTags.filter(t => t !== tagName));
        }
      } else {
        const response = await apiService.removeContactTag(conversationId, tag.id);
        if (response.success) {
          onTagsChange(currentTags.filter(t => t !== tagName));
        }
      }
    } catch (error) {
      console.error('Error removing tag:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Tags actuales */}
      <div className="flex flex-wrap gap-2">
        {currentTags.map((tagName, index) => {
          const tag = availableTags.find(t => t.name === tagName);
          return (
            <div
              key={index}
              className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: tag?.color ? `${tag.color}20` : '#6B7280',
                color: tag?.color || '#6B7280'
              }}
            >
              <Tag className="w-3 h-3" />
              <span>{tagName}</span>
              <button
                onClick={() => handleRemoveTag(tagName)}
                disabled={loading}
                className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Botón para agregar tag */}
      {!isAddingTag ? (
        <button
          onClick={() => setIsAddingTag(true)}
          className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <Plus className="w-3 h-3" />
          <span>Agregar etiqueta</span>
        </button>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Selecciona una etiqueta para agregar:
          </div>
          <div className="flex flex-wrap gap-2">
            {unassignedTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleAddTag(tag.id)}
                disabled={loading}
                className="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={{
                  borderColor: tag.color,
                  color: tag.color
                }}
              >
                <Tag className="w-3 h-3" />
                <span>{tag.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              setIsAddingTag(false);
              setSelectedTagId(null);
            }}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Cancelar
          </button>
        </div>
      )}

      {unassignedTags.length === 0 && isAddingTag && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          No hay etiquetas disponibles para agregar.
        </div>
      )}
    </div>
  );
};

export default ChatTagsManager;
