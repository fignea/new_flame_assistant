import React, { useState } from 'react';
import { ChevronDown, Building2, Plus } from 'lucide-react';
import { useOrganization } from '../contexts/OrganizationContext';

interface OrganizationSelectorProps {
  className?: string;
}

export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({ className = '' }) => {
  const { 
    organizations, 
    currentOrganization, 
    isLoading, 
    switchOrganization 
  } = useOrganization();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: '',
    slug: '',
    description: ''
  });

  const handleSwitchOrganization = async (organizationId: number) => {
    try {
      await switchOrganization(organizationId);
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching organization:', error);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { createOrganization } = useOrganization();
      await createOrganization(createFormData);
      setShowCreateForm(false);
      setCreateFormData({ name: '', slug: '', description: '' });
    } catch (error) {
      console.error('Error creating organization:', error);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setCreateFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse bg-gray-200 rounded-full h-8 w-8"></div>
        <div className="animate-pulse bg-gray-200 rounded h-4 w-32"></div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
      >
        <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {currentOrganization?.name || 'Seleccionar organización'}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Organizaciones
              </h3>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva</span>
              </button>
            </div>

            {showCreateForm && (
              <form onSubmit={handleCreateOrganization} className="mb-4 p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={createFormData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                      placeholder="Mi Empresa"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Slug
                    </label>
                    <input
                      type="text"
                      value={createFormData.slug}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                      placeholder="mi-empresa"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Descripción
                    </label>
                    <textarea
                      value={createFormData.description}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
                      placeholder="Descripción de la organización"
                      rows={2}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Crear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-1 max-h-60 overflow-y-auto">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleSwitchOrganization(org.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentOrganization?.id === org.id
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {org.slug} • {org.plan}
                      </div>
                    </div>
                    {org.role && (
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-zinc-600 text-gray-600 dark:text-gray-300 rounded">
                        {org.role}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {organizations.length === 0 && (
              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No tienes organizaciones</p>
                <p className="text-xs">Crea una nueva organización para comenzar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Overlay para cerrar el dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
