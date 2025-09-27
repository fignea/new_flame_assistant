-- Migración simple a multi-tenant
-- Crear tabla de organizaciones
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{}',
    plan VARCHAR(50) DEFAULT 'free',
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
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{}',
    invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, user_id)
);

-- Agregar organization_id a todas las tablas existentes
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE scheduled_messages ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE assistants ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE web_visitors ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE web_conversations ADD COLUMN IF NOT EXISTS organization_id INTEGER;
ALTER TABLE web_messages ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- Crear organización por defecto
INSERT INTO organizations (name, slug, description, plan, max_users, max_whatsapp_sessions) VALUES 
('Organización Principal', 'default-org', 'Organización por defecto para usuarios existentes', 'free', 50, 5)
ON CONFLICT (slug) DO NOTHING;

-- Obtener el ID de la organización por defecto y asignar a todos los usuarios
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

-- Agregar foreign keys
ALTER TABLE whatsapp_sessions ADD CONSTRAINT fk_whatsapp_sessions_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD CONSTRAINT fk_contacts_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE messages ADD CONSTRAINT fk_messages_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE scheduled_messages ADD CONSTRAINT fk_scheduled_messages_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE assistants ADD CONSTRAINT fk_assistants_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE web_visitors ADD CONSTRAINT fk_web_visitors_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE web_conversations ADD CONSTRAINT fk_web_conversations_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE web_messages ADD CONSTRAINT fk_web_messages_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Crear índices
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

-- Crear índices compuestos
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_org_user ON whatsapp_sessions(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_user ON contacts(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_org_user ON messages(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_org_user ON scheduled_messages(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_assistants_org_user ON assistants(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_web_visitors_org_user ON web_visitors(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_web_conversations_org_user ON web_conversations(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_web_messages_org_user ON web_messages(organization_id, user_id);
