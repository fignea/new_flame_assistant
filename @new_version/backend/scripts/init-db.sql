-- Inicialización de base de datos PostgreSQL para WhatsApp Manager

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de sesiones de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(50),
    name VARCHAR(255),
    is_connected BOOLEAN DEFAULT FALSE,
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de contactos
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    whatsapp_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone_number VARCHAR(50),
    is_group BOOLEAN DEFAULT FALSE,
    avatar_url TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    last_interaction TIMESTAMP,
    interaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de asistentes (debe ir antes de messages por las referencias)
CREATE TABLE IF NOT EXISTS assistants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    openai_api_key TEXT,
    model VARCHAR(50) DEFAULT 'gpt-3.5-turbo',
    max_tokens INTEGER DEFAULT 150,
    temperature DECIMAL(2,1) DEFAULT 0.7,
    auto_assign BOOLEAN DEFAULT TRUE,
    response_delay INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    whatsapp_message_id VARCHAR(255) NOT NULL,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    chat_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    is_from_me BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    media_url TEXT,
    assistant_id INTEGER REFERENCES assistants(id),
    is_auto_response BOOLEAN DEFAULT FALSE,
    template_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de programación
CREATE TABLE IF NOT EXISTS scheduled_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    chat_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Crear tabla de visitantes web
CREATE TABLE IF NOT EXISTS web_visitors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    location VARCHAR(255),
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de conversaciones web
CREATE TABLE IF NOT EXISTS web_conversations (
    id SERIAL PRIMARY KEY,
    public_id VARCHAR(20) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    visitor_id INTEGER REFERENCES web_visitors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    tags TEXT[],
    metadata JSONB,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla de mensajes web
CREATE TABLE IF NOT EXISTS web_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES web_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL,
    sender_id INTEGER,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- NUEVAS TABLAS PARA SISTEMA DE ASISTENTES
-- ========================================

-- 1. Asignaciones de asistentes a conversaciones
CREATE TABLE IF NOT EXISTS assistant_assignments (
    id SERIAL PRIMARY KEY,
    assistant_id INTEGER REFERENCES assistants(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'whatsapp', 'web', 'facebook', etc.
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    assignment_type VARCHAR(50) DEFAULT 'automatic', -- 'automatic', 'manual'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Plantillas de respuestas
CREATE TABLE IF NOT EXISTS response_templates (
    id SERIAL PRIMARY KEY,
    assistant_id INTEGER REFERENCES assistants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    trigger_keywords TEXT[], -- Palabras clave que activan esta plantilla
    conditions JSONB, -- Condiciones específicas
    category VARCHAR(100), -- Categoría de la plantilla
    priority INTEGER DEFAULT 0, -- Prioridad de la plantilla
    response_delay INTEGER DEFAULT 0, -- Retraso en segundos antes de responder
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sistema de etiquetas
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color en hex
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Etiquetas de conversaciones
CREATE TABLE IF NOT EXISTS conversation_tags (
    conversation_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, platform, tag_id)
);

-- 5. Etiquetas de contactos
CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (contact_id, tag_id)
);

-- 6. Historial de interacciones
CREATE TABLE IF NOT EXISTS interaction_history (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'message', 'call', 'meeting'
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Notas de contactos
CREATE TABLE IF NOT EXISTS contact_notes (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Configuración de asistentes
CREATE TABLE IF NOT EXISTS assistant_configs (
    id SERIAL PRIMARY KEY,
    assistant_id INTEGER REFERENCES assistants(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assistant_id, config_key)
);

-- Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_user_id ON scheduled_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_scheduled_time ON scheduled_messages(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_messages_status ON scheduled_messages(status);

-- Índices para web chat
CREATE INDEX IF NOT EXISTS idx_web_visitors_user_id ON web_visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_web_visitors_session_id ON web_visitors(session_id);
CREATE INDEX IF NOT EXISTS idx_web_conversations_public_id ON web_conversations(public_id);
CREATE INDEX IF NOT EXISTS idx_web_conversations_user_id ON web_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_web_conversations_visitor_id ON web_conversations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_web_conversations_status ON web_conversations(status);
CREATE INDEX IF NOT EXISTS idx_web_conversations_last_message_at ON web_conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_web_messages_conversation_id ON web_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_web_messages_created_at ON web_messages(created_at);

-- Índices para nuevas tablas de asistentes
CREATE INDEX IF NOT EXISTS idx_assistant_assignments_assistant_id ON assistant_assignments(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_assignments_conversation_id ON assistant_assignments(conversation_id);
CREATE INDEX IF NOT EXISTS idx_assistant_assignments_platform ON assistant_assignments(platform);
CREATE INDEX IF NOT EXISTS idx_assistant_assignments_is_active ON assistant_assignments(is_active);

CREATE INDEX IF NOT EXISTS idx_response_templates_assistant_id ON response_templates(assistant_id);
CREATE INDEX IF NOT EXISTS idx_response_templates_is_active ON response_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_response_templates_trigger_keywords ON response_templates USING GIN(trigger_keywords);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE INDEX IF NOT EXISTS idx_conversation_tags_conversation_id ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_platform ON conversation_tags(platform);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag_id ON conversation_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag_id ON contact_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_interaction_history_contact_id ON interaction_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_interaction_history_conversation_id ON interaction_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_interaction_history_type ON interaction_history(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interaction_history_created_at ON interaction_history(created_at);

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id ON contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_user_id ON contact_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_created_at ON contact_notes(created_at);

CREATE INDEX IF NOT EXISTS idx_assistant_configs_assistant_id ON assistant_configs(assistant_id);
CREATE INDEX IF NOT EXISTS idx_assistant_configs_key ON assistant_configs(config_key);

-- Índices adicionales para campos nuevos en tablas existentes
CREATE INDEX IF NOT EXISTS idx_contacts_avatar_url ON contacts(avatar_url);
CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON contacts(is_blocked);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON contacts(last_interaction);
CREATE INDEX IF NOT EXISTS idx_contacts_interaction_count ON contacts(interaction_count);

CREATE INDEX IF NOT EXISTS idx_assistants_openai_api_key ON assistants(openai_api_key);
CREATE INDEX IF NOT EXISTS idx_assistants_model ON assistants(model);
CREATE INDEX IF NOT EXISTS idx_assistants_auto_assign ON assistants(auto_assign);

CREATE INDEX IF NOT EXISTS idx_messages_assistant_id ON messages(assistant_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_auto_response ON messages(is_auto_response);
CREATE INDEX IF NOT EXISTS idx_messages_template_id ON messages(template_id);

-- Crear tabla de archivos multimedia
CREATE TABLE IF NOT EXISTS media_files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    original_name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- Para videos/audio en segundos
    thumbnail_path TEXT, -- Para videos/imágenes
    is_compressed BOOLEAN DEFAULT FALSE,
    compression_ratio DECIMAL(5,2), -- Ratio de compresión (0.0 - 1.0)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para la tabla de archivos multimedia
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_file_type ON media_files(file_type);
CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON media_files(created_at);

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_messages_updated_at BEFORE UPDATE ON scheduled_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_web_conversations_updated_at BEFORE UPDATE ON web_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistant_assignments_updated_at BEFORE UPDATE ON assistant_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_response_templates_updated_at BEFORE UPDATE ON response_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_notes_updated_at BEFORE UPDATE ON contact_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistant_configs_updated_at BEFORE UPDATE ON assistant_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_media_files_updated_at BEFORE UPDATE ON media_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario de demostración por defecto
-- Email: admin@flame.com
-- Contraseña: flame123 (hash bcryptjs)
INSERT INTO users (email, password, name) VALUES (
    'admin@flame.com',
    '$2a$10$I0OxCUtctlX2g1KR5kHjF.JXA3ub/BMiq7QVtoyaMV42NOTVai5ZC', -- flame123
    'Administrator'
) ON CONFLICT (email) DO NOTHING;

-- Insertar un asistente de demostración por defecto
INSERT INTO assistants (user_id, name, description, prompt, is_active) VALUES (
    (SELECT id FROM users WHERE email = 'admin@flame.com'),
    'Asistente General',
    'Asistente de WhatsApp para responder consultas generales',
    'Eres un asistente virtual de WhatsApp. Responde de manera amable y profesional a las consultas de los usuarios. Si no sabes algo, admítelo y ofrece ayuda alternativa.',
    true
) ON CONFLICT DO NOTHING;

-- Crear etiquetas de demostración
INSERT INTO tags (user_id, name, description, color, is_active) VALUES 
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Ventas', 'Etiqueta para conversaciones de ventas', '#10B981', true),
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Soporte', 'Etiqueta para consultas de soporte técnico', '#F59E0B', true),
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Urgente', 'Etiqueta para asuntos urgentes', '#EF4444', true),
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Nuevo Cliente', 'Etiqueta para nuevos clientes', '#8B5CF6', true),
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Seguimiento', 'Etiqueta para seguimiento de casos', '#06B6D4', true)
ON CONFLICT DO NOTHING;

-- Crear plantillas de demostración
INSERT INTO response_templates (assistant_id, name, content, trigger_keywords, category, priority, response_delay, is_active) VALUES 
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'Saludo Inicial', '¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte hoy?', ARRAY['hola', 'buenos días', 'buenas tardes', 'buenas noches'], 'greeting', 1, 2, true),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'Consulta de Precios', 'Te ayudo con información sobre nuestros precios. ¿Te interesa algún producto específico?', ARRAY['precio', 'costo', 'cuanto cuesta', 'valor'], 'information', 2, 3, true),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'Soporte Técnico', 'Entiendo que tienes un problema técnico. Voy a conectarte con nuestro equipo de soporte.', ARRAY['problema', 'error', 'no funciona', 'ayuda técnica'], 'escalation', 3, 1, true),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'Despedida', '¡Gracias por contactarnos! Si tienes más preguntas, no dudes en escribirnos. ¡Que tengas un excelente día!', ARRAY['gracias', 'chau', 'adiós', 'hasta luego'], 'farewell', 1, 2, true)
ON CONFLICT DO NOTHING;