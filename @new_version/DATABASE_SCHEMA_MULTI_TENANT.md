# 🗄️ Schema de Base de Datos Multi-Tenant - Flame Assistant

## 📋 Resumen Ejecutivo

Este documento presenta el diseño completo de la base de datos para **Flame Assistant**, una plataforma multi-tenant de gestión de WhatsApp Web que combina mensajería inteligente, automatización y asistentes de IA. El schema está diseñado siguiendo las mejores prácticas de bases de datos multi-tenant, escalabilidad y rendimiento.

## 🎯 Objetivos del Diseño

- ✅ **Multi-tenancy**: Aislamiento completo de datos por organización
- ✅ **Escalabilidad**: Soporte para millones de registros y miles de tenants
- ✅ **Rendimiento**: Índices optimizados y consultas eficientes
- ✅ **Seguridad**: Encriptación y auditoría completa
- ✅ **Flexibilidad**: Estructura adaptable a futuras funcionalidades
- ✅ **Integridad**: Constraints y validaciones robustas

---

## 🏗️ Arquitectura Multi-Tenant

### Estrategia de Aislamiento: **Schema-per-Tenant + Row-Level Security**

```sql
-- Estructura de schemas por tenant
flame_production.tenant_1_org_abc123
flame_production.tenant_2_org_def456
flame_production.tenant_3_org_ghi789
```

### Ventajas de esta Estrategia:
- ✅ **Aislamiento total** de datos entre tenants
- ✅ **Escalabilidad horizontal** fácil
- ✅ **Backup/restore** granular por tenant
- ✅ **Migraciones** independientes por tenant
- ✅ **Compliance** y regulaciones por región

---

## 📊 Tablas Principales

### 1. **TENANTS (Organizaciones)**

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL, -- org-abc123
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE, -- subdomain.flame.com
    plan_type VARCHAR(50) NOT NULL DEFAULT 'starter', -- starter, pro, enterprise
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, suspended, cancelled
    settings JSONB DEFAULT '{}',
    billing_info JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}', -- {max_users: 10, max_contacts: 1000}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_created_at ON tenants(created_at);
```

### 2. **USERS (Usuarios del Sistema)**

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'agent', -- owner, admin, manager, agent, viewer
    permissions JSONB DEFAULT '{}',
    profile JSONB DEFAULT '{}', -- avatar, phone, timezone, etc.
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, email)
);

-- Índices
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_last_login_at ON users(last_login_at);
```

### 3. **INTEGRATIONS (Integraciones)**

```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- whatsapp, facebook, instagram, telegram, web_chat
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'inactive', -- active, inactive, error, pending
    config JSONB NOT NULL DEFAULT '{}', -- API keys, tokens, settings
    credentials JSONB NOT NULL DEFAULT '{}', -- encrypted sensitive data
    webhook_url VARCHAR(500),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, type, name)
);

-- Índices
CREATE INDEX idx_integrations_tenant_id ON integrations(tenant_id);
CREATE INDEX idx_integrations_type ON integrations(type);
CREATE INDEX idx_integrations_status ON integrations(status);
```

### 4. **CONTACTS (Contactos)**

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL, -- ID en la plataforma externa
    platform VARCHAR(50) NOT NULL, -- whatsapp, facebook, instagram, web
    name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    avatar_url TEXT,
    is_group BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}', -- datos específicos de la plataforma
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    last_interaction_at TIMESTAMP WITH TIME ZONE,
    interaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, platform, external_id)
);

-- Índices
CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_platform ON contacts(platform);
CREATE INDEX idx_contacts_external_id ON contacts(external_id);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_group ON contacts(is_group);
CREATE INDEX idx_contacts_last_interaction_at ON contacts(last_interaction_at);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
```

### 5. **CONVERSATIONS (Conversaciones)**

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    external_conversation_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active', -- active, closed, pending, resolved
    priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    last_message_at TIMESTAMP WITH TIME ZONE,
    first_response_at TIMESTAMP WITH TIME ZONE,
    resolution_time INTEGER, -- en segundos
    satisfaction_score INTEGER, -- 1-5
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, platform, external_conversation_id)
);

-- Índices
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_platform ON conversations(platform);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_assigned_to ON conversations(assigned_to);
CREATE INDEX idx_conversations_assistant_id ON conversations(assistant_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_conversations_tags ON conversations USING GIN(tags);
```

### 6. **MESSAGES (Mensajes)**

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    external_message_id VARCHAR(255) NOT NULL,
    sender_type VARCHAR(20) NOT NULL, -- user, contact, assistant, system
    sender_id UUID, -- user_id o contact_id según sender_type
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- text, image, video, audio, document, etc.
    media_url TEXT,
    media_metadata JSONB DEFAULT '{}',
    is_from_me BOOLEAN DEFAULT FALSE,
    is_auto_response BOOLEAN DEFAULT FALSE,
    template_id UUID REFERENCES response_templates(id),
    assistant_id UUID REFERENCES assistants(id),
    status VARCHAR(20) DEFAULT 'sent', -- pending, sent, delivered, read, failed
    error_message TEXT,
    quoted_message_id UUID REFERENCES messages(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, platform, external_message_id)
);

-- Índices
CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_type ON messages(sender_type);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_status ON messages(status);
CREATE INDEX idx_messages_is_auto_response ON messages(is_auto_response);
```

### 7. **ASSISTANTS (Asistentes de IA)**

```sql
CREATE TABLE assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    ai_provider VARCHAR(50) DEFAULT 'openai', -- openai, anthropic, local
    model VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    api_key_encrypted TEXT, -- encriptado
    max_tokens INTEGER DEFAULT 150,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    auto_assign BOOLEAN DEFAULT TRUE,
    response_delay INTEGER DEFAULT 0, -- segundos
    working_hours JSONB DEFAULT '{}',
    business_hours JSONB DEFAULT '{}',
    fallback_message TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_assistants_tenant_id ON assistants(tenant_id);
CREATE INDEX idx_assistants_is_active ON assistants(is_active);
CREATE INDEX idx_assistants_auto_assign ON assistants(auto_assign);
```

### 8. **RESPONSE_TEMPLATES (Plantillas de Respuesta)**

```sql
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

-- Índices
CREATE INDEX idx_response_templates_tenant_id ON response_templates(tenant_id);
CREATE INDEX idx_response_templates_assistant_id ON response_templates(assistant_id);
CREATE INDEX idx_response_templates_category ON response_templates(category);
CREATE INDEX idx_response_templates_is_active ON response_templates(is_active);
CREATE INDEX idx_response_templates_trigger_keywords ON response_templates USING GIN(trigger_keywords);
```

### 9. **TAGS (Etiquetas)**

```sql
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

-- Índices
CREATE INDEX idx_tags_tenant_id ON tags(tenant_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_is_active ON tags(is_active);
```

### 10. **SCHEDULED_MESSAGES (Mensajes Programados)**

```sql
CREATE TABLE scheduled_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    media_url TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed, cancelled
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_scheduled_messages_tenant_id ON scheduled_messages(tenant_id);
CREATE INDEX idx_scheduled_messages_conversation_id ON scheduled_messages(conversation_id);
CREATE INDEX idx_scheduled_messages_scheduled_at ON scheduled_messages(scheduled_at);
CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status);
```

---

## 🔐 Tablas de Seguridad y Auditoría

### 11. **AUDIT_LOGS (Logs de Auditoría)**

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- create, update, delete, login, logout
    resource_type VARCHAR(100) NOT NULL, -- user, contact, message, etc.
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

### 12. **API_KEYS (Claves de API)**

```sql
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

-- Índices
CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);
```

### 13. **WEBHOOKS (Webhooks)**

```sql
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL, -- message.received, conversation.created, etc.
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

-- Índices
CREATE INDEX idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);
```

---

## 📈 Tablas de Analytics y Reportes

### 14. **ANALYTICS_EVENTS (Eventos de Analytics)**

```sql
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- message_sent, conversation_created, etc.
    event_data JSONB NOT NULL,
    user_id UUID REFERENCES users(id),
    conversation_id UUID REFERENCES conversations(id),
    contact_id UUID REFERENCES contacts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Crear particiones mensuales
CREATE TABLE analytics_events_2024_01 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE analytics_events_2024_02 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... más particiones según necesidad

-- Índices
CREATE INDEX idx_analytics_events_tenant_id ON analytics_events(tenant_id);
CREATE INDEX idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
```

### 15. **PERFORMANCE_METRICS (Métricas de Rendimiento)**

```sql
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20), -- seconds, count, percentage
    dimensions JSONB DEFAULT '{}', -- filtros adicionales
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Índices
CREATE INDEX idx_performance_metrics_tenant_id ON performance_metrics(tenant_id);
CREATE INDEX idx_performance_metrics_metric_name ON performance_metrics(metric_name);
CREATE INDEX idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);
```

---

## 🔧 Funciones y Triggers

### Función de Actualización Automática de Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

### Trigger para Auditoría Automática

```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            tenant_id, user_id, action, resource_type, resource_id, old_values
        ) VALUES (
            OLD.tenant_id, 
            current_setting('app.current_user_id')::UUID,
            'DELETE',
            TG_TABLE_NAME,
            OLD.id,
            to_jsonb(OLD)
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            tenant_id, user_id, action, resource_type, resource_id, old_values, new_values
        ) VALUES (
            NEW.tenant_id,
            current_setting('app.current_user_id')::UUID,
            'UPDATE',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            tenant_id, user_id, action, resource_type, resource_id, new_values
        ) VALUES (
            NEW.tenant_id,
            current_setting('app.current_user_id')::UUID,
            'INSERT',
            TG_TABLE_NAME,
            NEW.id,
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';
```

### Aplicar Triggers a Tablas Principales

```sql
-- Triggers de actualización de timestamps
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers de auditoría
CREATE TRIGGER audit_tenants AFTER INSERT OR UPDATE OR DELETE ON tenants FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_contacts AFTER INSERT OR UPDATE OR DELETE ON contacts FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_conversations AFTER INSERT OR UPDATE OR DELETE ON conversations FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_messages AFTER INSERT OR UPDATE OR DELETE ON messages FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

---

## 🚀 Optimizaciones de Rendimiento

### 1. **Particionado de Tablas Grandes**

```sql
-- Particionado por tenant_id para mensajes
CREATE TABLE messages_partitioned (
    LIKE messages INCLUDING ALL
) PARTITION BY HASH (tenant_id);

-- Crear particiones
CREATE TABLE messages_partition_0 PARTITION OF messages_partitioned
    FOR VALUES WITH (modulus 4, remainder 0);
CREATE TABLE messages_partition_1 PARTITION OF messages_partitioned
    FOR VALUES WITH (modulus 4, remainder 1);
CREATE TABLE messages_partition_2 PARTITION OF messages_partitioned
    FOR VALUES WITH (modulus 4, remainder 2);
CREATE TABLE messages_partition_3 PARTITION OF messages_partitioned
    FOR VALUES WITH (modulus 4, remainder 3);
```

### 2. **Índices Compuestos Optimizados**

```sql
-- Índices para consultas frecuentes
CREATE INDEX idx_messages_tenant_conversation_created 
    ON messages(tenant_id, conversation_id, created_at DESC);

CREATE INDEX idx_conversations_tenant_status_assigned 
    ON conversations(tenant_id, status, assigned_to);

CREATE INDEX idx_contacts_tenant_platform_last_interaction 
    ON contacts(tenant_id, platform, last_interaction_at DESC);

CREATE INDEX idx_analytics_events_tenant_type_created 
    ON analytics_events(tenant_id, event_type, created_at DESC);
```

### 3. **Índices Parciales para Datos Activos**

```sql
-- Solo índices para registros activos
CREATE INDEX idx_users_active ON users(tenant_id, email) WHERE is_active = TRUE;
CREATE INDEX idx_conversations_active ON conversations(tenant_id, status) WHERE status = 'active';
CREATE INDEX idx_assistants_active ON assistants(tenant_id, name) WHERE is_active = TRUE;
```

---

## 🔒 Seguridad y Encriptación

### 1. **Row Level Security (RLS)**

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY tenant_isolation ON tenants
    FOR ALL TO authenticated
    USING (id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY user_tenant_isolation ON users
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY contact_tenant_isolation ON contacts
    FOR ALL TO authenticated
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 2. **Encriptación de Datos Sensibles**

```sql
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
```

---

## 📊 Vistas Materializadas para Reportes

### 1. **Dashboard Principal**

```sql
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT c.id) as total_contacts,
    COUNT(DISTINCT conv.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT CASE WHEN conv.status = 'active' THEN conv.id END) as active_conversations,
    COUNT(DISTINCT CASE WHEN m.created_at >= CURRENT_DATE THEN m.id END) as messages_today,
    AVG(CASE WHEN conv.resolution_time IS NOT NULL THEN conv.resolution_time END) as avg_resolution_time
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = TRUE
LEFT JOIN contacts c ON t.id = c.tenant_id
LEFT JOIN conversations conv ON t.id = conv.tenant_id
LEFT JOIN messages m ON conv.id = m.conversation_id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_dashboard_stats_tenant_id ON dashboard_stats(tenant_id);
```

### 2. **Métricas de Asistentes**

```sql
CREATE MATERIALIZED VIEW assistant_metrics AS
SELECT 
    a.tenant_id,
    a.id as assistant_id,
    a.name as assistant_name,
    COUNT(DISTINCT conv.id) as total_conversations,
    COUNT(DISTINCT m.id) as total_messages,
    COUNT(DISTINCT CASE WHEN m.is_auto_response = TRUE THEN m.id END) as auto_responses,
    AVG(CASE WHEN conv.resolution_time IS NOT NULL THEN conv.resolution_time END) as avg_response_time,
    AVG(conv.satisfaction_score) as avg_satisfaction
FROM assistants a
LEFT JOIN conversations conv ON a.id = conv.assistant_id
LEFT JOIN messages m ON conv.id = m.conversation_id
WHERE a.is_active = TRUE AND a.deleted_at IS NULL
GROUP BY a.tenant_id, a.id, a.name;

-- Índice para la vista materializada
CREATE UNIQUE INDEX idx_assistant_metrics_assistant_id ON assistant_metrics(assistant_id);
```

---

## 🔄 Migraciones y Versionado

### Script de Migración Base

```sql
-- migrations/001_initial_schema.sql
-- migrations/002_add_analytics.sql
-- migrations/003_add_webhooks.sql
-- migrations/004_add_performance_metrics.sql

-- Tabla de versiones de migración
CREATE TABLE schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📋 Checklist de Implementación

### ✅ **Fase 1: Estructura Base**
- [ ] Crear esquema principal
- [ ] Implementar tablas de tenants y usuarios
- [ ] Configurar RLS y seguridad básica
- [ ] Crear índices principales

### ✅ **Fase 2: Funcionalidades Core**
- [ ] Implementar tablas de contactos y conversaciones
- [ ] Crear sistema de mensajes
- [ ] Implementar asistentes y plantillas
- [ ] Configurar sistema de etiquetas

### ✅ **Fase 3: Integraciones**
- [ ] Crear tablas de integraciones
- [ ] Implementar webhooks
- [ ] Configurar API keys
- [ ] Crear sistema de programación

### ✅ **Fase 4: Analytics y Reportes**
- [ ] Implementar tablas de analytics
- [ ] Crear vistas materializadas
- [ ] Configurar particionado
- [ ] Implementar métricas de rendimiento

### ✅ **Fase 5: Optimización**
- [ ] Aplicar índices avanzados
- [ ] Configurar particionado automático
- [ ] Implementar limpieza de datos
- [ ] Optimizar consultas frecuentes

---

## 🎯 Próximos Pasos

1. **Revisar y aprobar** el schema propuesto
2. **Implementar** las tablas base en orden de prioridad
3. **Configurar** el entorno de desarrollo con datos de prueba
4. **Migrar** datos existentes del sistema actual
5. **Implementar** las optimizaciones de rendimiento
6. **Configurar** monitoreo y alertas de la base de datos

---

## 📞 Contacto y Soporte

Para preguntas sobre este schema o sugerencias de mejora, contactar al equipo de desarrollo.

**Versión del Documento:** 1.0  
**Última Actualización:** Diciembre 2024  
**Próxima Revisión:** Enero 2025
