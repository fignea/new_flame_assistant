-- Esquema Multi-Tenant para WhatsApp Manager
-- Este script convierte la plataforma actual en multi-tenant

-- Crear tabla de organizaciones
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- URL amigable para la organización
    description TEXT,
    settings JSONB DEFAULT '{}',
    plan VARCHAR(50) DEFAULT 'free', -- free, pro, enterprise
    max_users INTEGER DEFAULT 5,
    max_whatsapp_sessions INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de roles de usuario en organizaciones
CREATE TABLE IF NOT EXISTS organization_roles (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- owner, admin, member
    permissions JSONB DEFAULT '{}',
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- Agregar organization_id a la tabla de usuarios (opcional, para usuarios que pueden estar en múltiples orgs)
-- ALTER TABLE users ADD COLUMN default_organization_id INTEGER REFERENCES organizations(id);

-- Modificar tabla de sesiones de WhatsApp para incluir organization_id
ALTER TABLE whatsapp_sessions ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Modificar tabla de contactos para incluir organization_id
ALTER TABLE contacts ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Modificar tabla de mensajes para incluir organization_id
ALTER TABLE messages ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Modificar tabla de programación para incluir organization_id
ALTER TABLE scheduled_messages ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Modificar tabla de asistentes para incluir organization_id
ALTER TABLE assistants ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Modificar tabla de visitantes web para incluir organization_id
ALTER TABLE web_visitors ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Modificar tabla de conversaciones web para incluir organization_id
ALTER TABLE web_conversations ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Modificar tabla de mensajes web para incluir organization_id
ALTER TABLE web_messages ADD COLUMN organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE;

-- Los índices se crearán después de agregar las columnas

-- Función para obtener la organización del usuario
CREATE OR REPLACE FUNCTION get_user_organization(user_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    org_id INTEGER;
BEGIN
    SELECT organization_id INTO org_id
    FROM organization_roles
    WHERE user_id = user_id_param
    ORDER BY joined_at ASC
    LIMIT 1;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un usuario pertenece a una organización
CREATE OR REPLACE FUNCTION user_belongs_to_organization(user_id_param INTEGER, org_id_param INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    exists_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO exists_count
    FROM organization_roles
    WHERE user_id = user_id_param AND organization_id = org_id_param;
    
    RETURN exists_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener el rol del usuario en una organización
CREATE OR REPLACE FUNCTION get_user_role_in_organization(user_id_param INTEGER, org_id_param INTEGER)
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role
    FROM organization_roles
    WHERE user_id = user_id_param AND organization_id = org_id_param;
    
    RETURN user_role;
END;
$$ LANGUAGE plpgsql;

-- Crear organización por defecto para usuarios existentes
INSERT INTO organizations (name, slug, description, plan, max_users, max_whatsapp_sessions) VALUES 
('Organización Principal', 'default-org', 'Organización por defecto para usuarios existentes', 'free', 50, 5)
ON CONFLICT (slug) DO NOTHING;

-- Obtener el ID de la organización por defecto
DO $$
DECLARE
    default_org_id INTEGER;
    user_record RECORD;
BEGIN
    SELECT id INTO default_org_id FROM organizations WHERE slug = 'default-org';
    
    -- Asignar todos los usuarios existentes a la organización por defecto
    FOR user_record IN SELECT id FROM users LOOP
        INSERT INTO organization_roles (organization_id, user_id, role) 
        VALUES (default_org_id, user_record.id, 'owner')
        ON CONFLICT (organization_id, user_id) DO NOTHING;
    END LOOP;
    
    -- Actualizar todas las tablas existentes con organization_id
    UPDATE whatsapp_sessions SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE contacts SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE messages SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE scheduled_messages SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE assistants SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE web_visitors SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE web_conversations SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE web_messages SET organization_id = default_org_id WHERE organization_id IS NULL;
END $$;

-- Hacer organization_id NOT NULL después de la migración
ALTER TABLE whatsapp_sessions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE contacts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE messages ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE scheduled_messages ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE assistants ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE web_visitors ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE web_conversations ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE web_messages ALTER COLUMN organization_id SET NOT NULL;

-- Crear índices para mejorar performance con organization_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_organization_id ON whatsapp_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_organization_id ON messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_organization_id ON scheduled_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_assistants_organization_id ON assistants(organization_id);
CREATE INDEX IF NOT EXISTS idx_web_visitors_organization_id ON web_visitors(organization_id);
CREATE INDEX IF NOT EXISTS idx_web_conversations_organization_id ON web_conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_web_messages_organization_id ON web_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_roles_organization_id ON organization_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_roles_user_id ON organization_roles(user_id);

-- Crear índices compuestos para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_org_user ON whatsapp_sessions(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_user ON contacts(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_user ON messages(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_org_user ON scheduled_messages(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_assistants_org_user ON assistants(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_web_visitors_org_user ON web_visitors(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_web_conversations_org_user ON web_conversations(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_web_messages_org_user ON web_messages(organization_id, user_id);

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_organization_roles_updated_at BEFORE UPDATE ON organization_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Vista para obtener información completa de usuarios con sus organizaciones
CREATE OR REPLACE VIEW user_organizations_view AS
SELECT 
    u.id as user_id,
    u.email,
    u.name as user_name,
    u.created_at as user_created_at,
    o.id as organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    o.plan as organization_plan,
    or_role.role,
    or_role.joined_at,
    or_role.permissions
FROM users u
JOIN organization_roles or_role ON u.id = or_role.user_id
JOIN organizations o ON or_role.organization_id = o.id
WHERE o.is_active = true;

-- Vista para estadísticas de organizaciones
CREATE OR REPLACE VIEW organization_stats_view AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.slug as organization_slug,
    o.plan,
    COUNT(DISTINCT or_role.user_id) as total_users,
    COUNT(DISTINCT ws.id) as total_whatsapp_sessions,
    COUNT(DISTINCT c.id) as total_contacts,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT a.id) as total_assistants,
    COUNT(DISTINCT wc.id) as total_web_conversations
FROM organizations o
LEFT JOIN organization_roles or_role ON o.id = or_role.organization_id
LEFT JOIN whatsapp_sessions ws ON o.id = ws.organization_id
LEFT JOIN contacts c ON o.id = c.organization_id
LEFT JOIN messages m ON o.id = m.organization_id
LEFT JOIN assistants a ON o.id = a.organization_id
LEFT JOIN web_conversations wc ON o.id = wc.organization_id
WHERE o.is_active = true
GROUP BY o.id, o.name, o.slug, o.plan;

-- Insertar algunas organizaciones de ejemplo
INSERT INTO organizations (name, slug, description, plan, max_users, max_whatsapp_sessions) VALUES 
('Empresa Demo', 'empresa-demo', 'Organización de demostración', 'pro', 20, 3),
('Startup Tech', 'startup-tech', 'Startup tecnológica', 'free', 5, 1),
('Corporación Grande', 'corporacion-grande', 'Corporación con múltiples equipos', 'enterprise', 100, 10)
ON CONFLICT (slug) DO NOTHING;

-- Comentarios sobre el esquema
COMMENT ON TABLE organizations IS 'Tabla principal de organizaciones multi-tenant';
COMMENT ON TABLE organization_roles IS 'Relación muchos a muchos entre usuarios y organizaciones con roles';
COMMENT ON COLUMN organizations.slug IS 'Identificador único amigable para URLs (ej: mi-empresa)';
COMMENT ON COLUMN organizations.settings IS 'Configuraciones específicas de la organización en formato JSON';
COMMENT ON COLUMN organization_roles.role IS 'Rol del usuario: owner, admin, member';
COMMENT ON COLUMN organization_roles.permissions IS 'Permisos específicos del usuario en formato JSON';
