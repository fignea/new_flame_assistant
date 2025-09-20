-- Script de inicialización de la base de datos FLAME Assistant
-- Este script se ejecuta automáticamente cuando se crea el contenedor de PostgreSQL

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear esquema si no existe
CREATE SCHEMA IF NOT EXISTS public;

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de asistentes
CREATE TABLE IF NOT EXISTS assistants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('auto', 'ai')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'training')),
    auto_response TEXT,
    ai_prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de horarios
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Tabla de conversaciones
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('whatsapp', 'facebook', 'instagram', 'telegram')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'resolved', 'archived')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_assistant_id UUID REFERENCES assistants(id),
    last_message TEXT,
    last_message_time TIMESTAMP,
    unread_count INTEGER DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL CHECK (sender IN ('user', 'assistant', 'agent')),
    type VARCHAR(50) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'audio', 'video')),
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de integraciones
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('whatsapp', 'facebook', 'instagram', 'telegram')),
    status VARCHAR(50) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'error')),
    credentials JSONB NOT NULL,
    webhook_url VARCHAR(500),
    last_sync TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_assistants_status ON assistants(status);

CREATE INDEX IF NOT EXISTS idx_schedules_assistant_id ON schedules(assistant_id);
CREATE INDEX IF NOT EXISTS idx_schedules_day_enabled ON schedules(day_of_week, enabled) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_platform ON conversations(platform);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_assistant ON conversations(assigned_assistant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_time ON conversations(last_message_time DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_contact_name ON conversations USING gin(to_tsvector('spanish', contact_name));

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender);

CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario administrador por defecto (solo en desarrollo)
INSERT INTO users (email, password_hash, name, role, is_active) 
VALUES (
    'admin@flame-assistant.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4qjqjqjqjq', -- password: admin123
    'Administrador',
    'admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- Insertar algunos asistentes de ejemplo
INSERT INTO assistants (user_id, name, description, type, status, auto_response)
SELECT 
    u.id,
    'Asistente de Ventas',
    'Asistente especializado en ventas y atención al cliente',
    'auto',
    'active',
    '¡Hola! Soy tu asistente de ventas. ¿En qué puedo ayudarte hoy?'
FROM users u 
WHERE u.email = 'admin@flame-assistant.com'
ON CONFLICT DO NOTHING;

INSERT INTO assistants (user_id, name, description, type, status, ai_prompt)
SELECT 
    u.id,
    'Asistente IA Avanzado',
    'Asistente con inteligencia artificial para consultas complejas',
    'ai',
    'active',
    'Eres un asistente de IA especializado en atención al cliente. Responde de manera profesional y útil.'
FROM users u 
WHERE u.email = 'admin@flame-assistant.com'
ON CONFLICT DO NOTHING;

-- Crear algunos horarios de ejemplo
INSERT INTO schedules (assistant_id, day_of_week, start_time, end_time, enabled)
SELECT 
    a.id,
    generate_series(0, 6),
    '09:00',
    '18:00',
    true
FROM assistants a 
WHERE a.name = 'Asistente de Ventas'
ON CONFLICT DO NOTHING;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Base de datos FLAME Assistant inicializada correctamente';
    RAISE NOTICE 'Usuario administrador creado: admin@flame-assistant.com / admin123';
END $$;
