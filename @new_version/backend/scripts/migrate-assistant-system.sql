-- Migración para sistema de asistentes mejorado
-- Ejecutar después de init-db.sql

-- ========================================
-- MIGRACIÓN DE CAMPOS EXISTENTES
-- ========================================

-- Agregar campos a la tabla contacts si no existen
DO $$ 
BEGIN
    -- Verificar si las columnas ya existen antes de agregarlas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'avatar_url') THEN
        ALTER TABLE contacts ADD COLUMN avatar_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'is_blocked') THEN
        ALTER TABLE contacts ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'last_interaction') THEN
        ALTER TABLE contacts ADD COLUMN last_interaction TIMESTAMP;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'interaction_count') THEN
        ALTER TABLE contacts ADD COLUMN interaction_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Agregar campos a la tabla assistants si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistants' AND column_name = 'openai_api_key') THEN
        ALTER TABLE assistants ADD COLUMN openai_api_key TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistants' AND column_name = 'model') THEN
        ALTER TABLE assistants ADD COLUMN model VARCHAR(50) DEFAULT 'gpt-3.5-turbo';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistants' AND column_name = 'max_tokens') THEN
        ALTER TABLE assistants ADD COLUMN max_tokens INTEGER DEFAULT 150;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistants' AND column_name = 'temperature') THEN
        ALTER TABLE assistants ADD COLUMN temperature DECIMAL(2,1) DEFAULT 0.7;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistants' AND column_name = 'auto_assign') THEN
        ALTER TABLE assistants ADD COLUMN auto_assign BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistants' AND column_name = 'response_delay') THEN
        ALTER TABLE assistants ADD COLUMN response_delay INTEGER DEFAULT 0;
    END IF;
END $$;

-- Agregar campos a la tabla messages si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'assistant_id') THEN
        ALTER TABLE messages ADD COLUMN assistant_id INTEGER REFERENCES assistants(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'is_auto_response') THEN
        ALTER TABLE messages ADD COLUMN is_auto_response BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'template_id') THEN
        ALTER TABLE messages ADD COLUMN template_id INTEGER;
    END IF;
END $$;

-- ========================================
-- CREAR NUEVAS TABLAS
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sistema de etiquetas
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color en hex
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Etiquetas de conversaciones
CREATE TABLE IF NOT EXISTS conversation_tags (
    conversation_id VARCHAR(255) NOT NULL,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, tag_id)
);

-- 5. Historial de interacciones
CREATE TABLE IF NOT EXISTS interaction_history (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'message', 'call', 'meeting'
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Notas de contactos
CREATE TABLE IF NOT EXISTS contact_notes (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Configuración de asistentes
CREATE TABLE IF NOT EXISTS assistant_configs (
    id SERIAL PRIMARY KEY,
    assistant_id INTEGER REFERENCES assistants(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assistant_id, config_key)
);

-- ========================================
-- CREAR ÍNDICES
-- ========================================

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
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag_id ON conversation_tags(tag_id);

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

-- ========================================
-- CREAR TRIGGERS
-- ========================================

-- Función para actualizar timestamp automáticamente (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_assistants_updated_at BEFORE UPDATE ON assistants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistant_assignments_updated_at BEFORE UPDATE ON assistant_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_response_templates_updated_at BEFORE UPDATE ON response_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_notes_updated_at BEFORE UPDATE ON contact_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assistant_configs_updated_at BEFORE UPDATE ON assistant_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- DATOS DE DEMOSTRACIÓN
-- ========================================

-- Crear etiquetas de demostración
INSERT INTO tags (user_id, name, color) VALUES 
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Ventas', '#10B981'),
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Soporte', '#F59E0B'),
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Urgente', '#EF4444'),
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Nuevo Cliente', '#8B5CF6'),
    ((SELECT id FROM users WHERE email = 'admin@flame.com'), 'Seguimiento', '#06B6D4')
ON CONFLICT DO NOTHING;

-- Crear plantillas de demostración
INSERT INTO response_templates (assistant_id, name, content, trigger_keywords, is_active) VALUES 
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'Saludo Inicial', '¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte hoy?', ARRAY['hola', 'buenos días', 'buenas tardes', 'buenas noches'], true),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'Consulta de Precios', 'Te ayudo con información sobre nuestros precios. ¿Te interesa algún producto específico?', ARRAY['precio', 'costo', 'cuanto cuesta', 'valor'], true),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'Soporte Técnico', 'Entiendo que tienes un problema técnico. Voy a conectarte con nuestro equipo de soporte.', ARRAY['problema', 'error', 'no funciona', 'ayuda técnica'], true),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'Despedida', '¡Gracias por contactarnos! Si tienes más preguntas, no dudes en escribirnos. ¡Que tengas un excelente día!', ARRAY['gracias', 'chau', 'adiós', 'hasta luego'], true)
ON CONFLICT DO NOTHING;

-- Crear configuración de demostración para el asistente
INSERT INTO assistant_configs (assistant_id, config_key, config_value) VALUES 
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'response_delay_seconds', '2'),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'max_conversation_length', '10'),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'auto_assign_keywords', '["consulta", "pregunta", "ayuda", "información"]'),
    ((SELECT id FROM assistants WHERE name = 'Asistente General'), 'working_hours', '{"start": "09:00", "end": "18:00", "timezone": "America/Mexico_City"}')
ON CONFLICT (assistant_id, config_key) DO NOTHING;

-- ========================================
-- COMENTARIOS FINALES
-- ========================================

-- Esta migración agrega:
-- 1. 7 nuevas tablas para el sistema de asistentes
-- 2. Campos adicionales a tablas existentes
-- 3. Índices optimizados para performance
-- 4. Triggers para actualización automática de timestamps
-- 5. Datos de demostración para testing

-- Para ejecutar esta migración:
-- psql -d tu_base_de_datos -f migrate-assistant-system.sql
