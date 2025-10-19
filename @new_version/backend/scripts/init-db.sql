-- ========================================
-- FLAME ASSISTANT - SCHEMA MULTI-TENANT
-- ========================================
-- Script de inicialización completo para base de datos multi-tenant
-- Reemplaza completamente el schema anterior
-- Versión: 2.0
-- Fecha: Diciembre 2024

-- ========================================
-- CONFIGURACIÓN INICIAL
-- ========================================

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Configurar timezone por defecto
SET timezone = 'UTC';

-- ========================================
-- FUNCIONES AUXILIARES
-- ========================================

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para generar slug único
CREATE OR REPLACE FUNCTION generate_tenant_slug(tenant_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convertir nombre a slug
    base_slug := lower(regexp_replace(tenant_name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    
    final_slug := base_slug;
    
    -- Verificar unicidad y agregar contador si es necesario
    WHILE EXISTS (SELECT 1 FROM tenants WHERE slug = final_slug) LOOP
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ language 'plpgsql';

-- Función para encriptar datos sensibles
CREATE OR REPLACE FUNCTION encrypt_sensitive_data(data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

-- Función para desencriptar datos sensibles
CREATE OR REPLACE FUNCTION decrypt_sensitive_data(encrypted_data TEXT, key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, key);
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- TABLAS PRINCIPALES MULTI-TENANT
-- ========================================

-- 1. TENANTS (Organizaciones)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    plan_type VARCHAR(50) NOT NULL DEFAULT 'starter',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    billing_info JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{"max_users": 10, "max_contacts": 1000, "max_conversations": 5000}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. USERS (Usuarios del Sistema)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'agent',
    permissions JSONB DEFAULT '{}',
    profile JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, email)
);

-- 3. INTEGRATIONS (Integraciones)
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'inactive',
    config JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    webhook_url VARCHAR(500),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, type, name)
);

-- 4. CONTACTS (Contactos)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    avatar_url TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    interaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, platform, external_id)
);

-- 5. ASSISTANTS (Asistentes de IA)
CREATE TABLE assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    ai_provider VARCHAR(50) DEFAULT 'openai',
    model VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    api_key_encrypted TEXT,
    max_tokens INTEGER DEFAULT 150,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    auto_assign BOOLEAN DEFAULT TRUE,
    response_delay INTEGER DEFAULT 0,
    working_hours JSONB DEFAULT '{}',
    business_hours JSONB DEFAULT '{}',
    fallback_message TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 6. CONVERSATIONS (Conversaciones)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    external_conversation_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    last_message_at TIMESTAMP WITH TIME ZONE,
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolution_time INTEGER,
    satisfaction_score INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, platform, external_conversation_id)
);

-- 7. RESPONSE_TEMPLATES (Plantillas de Respuesta)
CREATE TABLE response_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    trigger_keywords TEXT[] DEFAULT '{}',
    conditions JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    response_delay INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 8. MESSAGES (Mensajes)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    external_message_id VARCHAR(255) NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_id UUID,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    media_url TEXT,
    media_metadata JSONB DEFAULT '{}',
    is_from_me BOOLEAN DEFAULT FALSE,
    is_auto_response BOOLEAN DEFAULT FALSE,
    template_id UUID REFERENCES response_templates(id),
    assistant_id UUID REFERENCES assistants(id),
    status VARCHAR(20) DEFAULT 'sent',
    error_message TEXT,
    quoted_message_id UUID REFERENCES messages(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, external_message_id)
);

-- 9. TAGS (Etiquetas)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6',
    category VARCHAR(50) DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, name)
);

-- 11. SCHEDULED_MESSAGES (Mensajes Programados)
CREATE TABLE scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    media_url TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLAS DE SEGURIDAD Y AUDITORÍA
-- ========================================

-- 12. AUDIT_LOGS (Logs de Auditoría)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. API_KEYS (Claves de API)
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. WEBHOOKS (Webhooks)
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL,
    secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TABLAS DE ANALYTICS Y REPORTES
-- ========================================

-- 15. ANALYTICS_EVENTS (Eventos de Analytics)
CREATE TABLE analytics_events (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    user_id UUID REFERENCES users(id),
    conversation_id UUID REFERENCES conversations(id),
    contact_id UUID REFERENCES contacts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 16. PERFORMANCE_METRICS (Métricas de Rendimiento)
CREATE TABLE performance_metrics (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20),
    dimensions JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- ========================================
-- TABLAS DE RELACIONES
-- ========================================

-- 17. CONVERSATION_TAGS (Etiquetas de Conversaciones)
CREATE TABLE conversation_tags (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (conversation_id, tag_id)
);

-- 18. CONTACT_TAGS (Etiquetas de Contactos)
CREATE TABLE contact_tags (
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (contact_id, tag_id)
);

-- 19. ASSISTANT_ASSIGNMENTS (Asignaciones de Asistentes)
CREATE TABLE assistant_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    assignment_type VARCHAR(50) DEFAULT 'automatic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 20. MEDIA_FILES (Archivos Multimedia)
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    thumbnail_path TEXT,
    is_compressed BOOLEAN DEFAULT FALSE,
    compression_ratio DECIMAL(5,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. CONTACT_NOTES (Notas de Contactos)
CREATE TABLE contact_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- ÍNDICES PRINCIPALES
-- ========================================

-- Índices para tenants
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);

-- Índices para users
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);

-- Índices para integrations
CREATE INDEX idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX idx_integrations_type ON integrations(type);
CREATE INDEX idx_integrations_status ON integrations(status);

-- Índices para contacts
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_platform ON contacts(platform);
CREATE INDEX idx_contacts_external_id ON contacts(external_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_group ON contacts(is_group);
CREATE INDEX idx_contacts_last_interaction_at ON contacts(last_interaction_at);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);

-- Índices para conversations
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_platform ON conversations(platform);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX idx_conversations_assistant_id ON conversations(assistant_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_conversations_tags ON conversations USING GIN(tags);

-- Índices para assistants
CREATE INDEX idx_assistants_tenant_id ON assistants(tenant_id);
CREATE INDEX idx_assistants_is_active ON assistants(is_active);
CREATE INDEX idx_assistants_auto_assign ON assistants(auto_assign);

-- Índices para messages
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_type ON messages(sender_type);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_is_auto_response ON messages(is_auto_response);

-- Índices para response_templates
CREATE INDEX idx_response_templates_tenant_id ON response_templates(tenant_id);
CREATE INDEX idx_response_templates_assistant_id ON response_templates(assistant_id);
CREATE INDEX idx_response_templates_category ON response_templates(category);
CREATE INDEX idx_response_templates_is_active ON response_templates(is_active);
CREATE INDEX idx_response_templates_trigger_keywords ON response_templates USING GIN(trigger_keywords);

-- Índices para tags
CREATE INDEX idx_tags_tenant_id ON tags(tenant_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_is_active ON tags(is_active);

-- Índices para scheduled_messages
CREATE INDEX idx_scheduled_messages_tenant_id ON scheduled_messages(tenant_id);
CREATE INDEX idx_scheduled_messages_conversation_id ON scheduled_messages(conversation_id);
CREATE INDEX idx_scheduled_messages_scheduled_at ON scheduled_messages(scheduled_at);
CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Índices para api_keys
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- Índices para webhooks
CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- Índices para analytics_events
CREATE INDEX idx_analytics_events_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);

-- Índices para performance_metrics
CREATE INDEX idx_performance_metrics_tenant_id ON performance_metrics(tenant_id);
CREATE INDEX idx_performance_metrics_metric_name ON performance_metrics(metric_name);
CREATE INDEX idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);

-- ========================================
-- ÍNDICES COMPUESTOS OPTIMIZADOS
-- ========================================

-- Índices para consultas frecuentes
CREATE INDEX idx_messages_tenant_conversation_created 
    ON messages(tenant_id, conversation_id, created_at DESC);

CREATE INDEX idx_conversations_tenant_status_assigned 
    ON conversations(tenant_id, status, assigned_to);

CREATE INDEX idx_contacts_tenant_platform_last_interaction 
    ON contacts(tenant_id, platform, last_interaction_at DESC);

CREATE INDEX idx_analytics_events_tenant_type_created 
    ON analytics_events(tenant_id, event_type, created_at DESC);

-- Índices parciales para datos activos
CREATE INDEX idx_users_active ON users(tenant_id, email) WHERE is_active = TRUE;
CREATE INDEX idx_conversations_active ON conversations(tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_assistants_active ON assistants(tenant_id, name) WHERE is_active = TRUE;

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para aislamiento por tenant
CREATE POLICY tenant_isolation ON tenants
    FOR ALL TO PUBLIC
    USING (id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY user_tenant_isolation ON users
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY integration_tenant_isolation ON integrations
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY contact_tenant_isolation ON contacts
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY conversation_tenant_isolation ON conversations
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY assistant_tenant_isolation ON assistants
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY message_tenant_isolation ON messages
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY template_tenant_isolation ON response_templates
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY tag_tenant_isolation ON tags
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY scheduled_message_tenant_isolation ON scheduled_messages
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY audit_log_tenant_isolation ON audit_logs
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY api_key_tenant_isolation ON api_keys
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY webhook_tenant_isolation ON webhooks
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY analytics_event_tenant_isolation ON analytics_events
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY performance_metric_tenant_isolation ON performance_metrics
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY conversation_tag_tenant_isolation ON conversation_tags
    FOR ALL TO PUBLIC
    USING (conversation_id IN (
        SELECT id FROM conversations WHERE tenant_id = current_setting('app.current_tenant_id')::UUID
    ));

CREATE POLICY contact_tag_tenant_isolation ON contact_tags
    FOR ALL TO PUBLIC
    USING (contact_id IN (
        SELECT id FROM contacts WHERE tenant_id = current_setting('app.current_tenant_id')::UUID
    ));

CREATE POLICY assistant_assignment_tenant_isolation ON assistant_assignments
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY media_file_tenant_isolation ON media_files
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY contact_note_tenant_isolation ON contact_notes
    FOR ALL TO PUBLIC
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- ========================================
-- TRIGGERS
-- ========================================

-- Triggers de actualización de timestamps
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_response_templates_updated_at BEFORE UPDATE ON response_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_messages_updated_at BEFORE UPDATE ON scheduled_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_webhooks_updated_at BEFORE UPDATE ON webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistant_assignments_updated_at BEFORE UPDATE ON assistant_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_notes_updated_at BEFORE UPDATE ON contact_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VISTAS MATERIALIZADAS
-- ========================================

-- Dashboard Principal
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.plan_type,
    t.status as tenant_status,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT c.id) as total_contacts,
    COUNT(DISTINCT conv.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT CASE WHEN conv.status = 'active' THEN conv.id END) as active_conversations,
    COUNT(DISTINCT CASE WHEN m.created_at >= CURRENT_DATE THEN m.id END) as messages_today,
    AVG(CASE WHEN conv.resolution_time IS NOT NULL THEN conv.resolution_time END) as avg_resolution_time,
    AVG(conv.satisfaction_score) as avg_satisfaction_score
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = TRUE AND u.deleted_at IS NULL
LEFT JOIN contacts c ON t.id = c.tenant_id
LEFT JOIN conversations conv ON t.id = conv.tenant_id
LEFT JOIN messages m ON conv.id = m.conversation_id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name, t.plan_type, t.status;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_dashboard_stats_tenant_id ON dashboard_stats(tenant_id);

-- Métricas de Asistentes
CREATE MATERIALIZED VIEW assistant_metrics AS
SELECT 
    a.tenant_id,
    a.id as assistant_id,
    a.name as assistant_name,
    a.is_active,
    COUNT(DISTINCT conv.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT CASE WHEN m.is_auto_response = TRUE THEN m.id END) as auto_responses,
    AVG(CASE WHEN conv.resolution_time IS NOT NULL THEN conv.resolution_time END) as avg_response_time,
    AVG(conv.satisfaction_score) as avg_satisfaction
FROM assistants a
LEFT JOIN conversations conv ON a.id = conv.assistant_id
LEFT JOIN messages m ON conv.id = m.conversation_id
WHERE a.is_active = TRUE AND a.deleted_at IS NULL
GROUP BY a.tenant_id, a.id, a.name, a.is_active;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_assistant_metrics_assistant_id ON assistant_metrics(assistant_id);

-- ========================================
-- DATOS DE DEMOSTRACIÓN
-- ========================================

-- Crear tenant de demostración
INSERT INTO tenants (slug, name, domain, plan_type, status, settings, limits) VALUES (
    'demo-tenant',
    'Demo Organization',
    'demo.flame.com',
    'pro',
    'active',
    '{"timezone": "America/Mexico_City", "language": "es"}',
    '{"max_users": 50, "max_contacts": 10000, "max_conversations": 50000}'
) ON CONFLICT (slug) DO NOTHING;

-- Crear usuario administrador de demostración
INSERT INTO users (tenant_id, email, password_hash, name, role, is_active) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-tenant'),
    'admin@demo.flame.com',
    '$2a$10$I0OxCUtctlX2g1KR5kHjF.JXA3ub/BMiq7QVtoyaMV42NOTVai5ZC', -- flame123
    'Administrator Demo',
    'owner',
    TRUE
) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Crear integración de WhatsApp de demostración
INSERT INTO integrations (tenant_id, type, name, status, config) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-tenant'),
    'whatsapp',
    'WhatsApp Principal',
    'active',
    '{"session_name": "demo_session", "qr_timeout": 300}'
) ON CONFLICT (tenant_id, type, name) DO NOTHING;

-- Crear asistente de demostración
INSERT INTO assistants (tenant_id, name, description, prompt, is_active, model, max_tokens, temperature) VALUES (
    (SELECT id FROM tenants WHERE slug = 'demo-tenant'),
    'Asistente General',
    'Asistente de WhatsApp para responder consultas generales',
    'Eres un asistente virtual de WhatsApp. Responde de manera amable y profesional a las consultas de los usuarios. Si no sabes algo, admítelo y ofrece ayuda alternativa.',
    TRUE,
    'gpt-3.5-turbo',
    150,
    0.7
) ON CONFLICT DO NOTHING;

-- Crear etiquetas de demostración
INSERT INTO tags (tenant_id, name, description, color, category, is_active) VALUES 
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Ventas', 'Etiqueta para conversaciones de ventas', '#10B981', 'business', TRUE),
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Soporte', 'Etiqueta para consultas de soporte técnico', '#F59E0B', 'support', TRUE),
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Urgente', 'Etiqueta para asuntos urgentes', '#EF4444', 'priority', TRUE),
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Nuevo Cliente', 'Etiqueta para nuevos clientes', '#8B5CF6', 'customer', TRUE),
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Seguimiento', 'Etiqueta para seguimiento de casos', '#06B6D4', 'followup', TRUE)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Crear plantillas de demostración
INSERT INTO response_templates (tenant_id, assistant_id, name, content, trigger_keywords, category, priority, response_delay, is_active) VALUES 
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 
     (SELECT id FROM assistants WHERE name = 'Asistente General'), 
     'Saludo Inicial', 
     '¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte hoy?', 
     ARRAY['hola', 'buenos días', 'buenas tardes', 'buenas noches'], 
     'greeting', 1, 2, TRUE),
    
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 
     (SELECT id FROM assistants WHERE name = 'Asistente General'), 
     'Consulta de Precios', 
     'Te ayudo con información sobre nuestros precios. ¿Te interesa algún producto específico?', 
     ARRAY['precio', 'costo', 'cuanto cuesta', 'valor'], 
     'information', 2, 3, TRUE),
    
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 
     (SELECT id FROM assistants WHERE name = 'Asistente General'), 
     'Soporte Técnico', 
     'Entiendo que tienes un problema técnico. Voy a conectarte con nuestro equipo de soporte.', 
     ARRAY['problema', 'error', 'no funciona', 'ayuda técnica'], 
     'escalation', 3, 1, TRUE),
    
    ((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 
     (SELECT id FROM assistants WHERE name = 'Asistente General'), 
     'Despedida', 
     '¡Gracias por contactarnos! Si tienes más preguntas, no dudes en escribirnos. ¡Que tengas un excelente día!', 
     ARRAY['gracias', 'chau', 'adiós', 'hasta luego'], 
     'farewell', 1, 2, TRUE)
ON CONFLICT DO NOTHING;

-- ========================================
-- CONFIGURACIÓN FINAL
-- ========================================

-- Actualizar estadísticas de la base de datos
ANALYZE;

-- Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FLAME ASSISTANT - SCHEMA MULTI-TENANT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Schema inicializado correctamente';
    RAISE NOTICE 'Tenant demo creado: demo-tenant';
    RAISE NOTICE 'Usuario admin: admin@demo.flame.com';
    RAISE NOTICE 'Contraseña: flame123';
    RAISE NOTICE '========================================';
END $$;