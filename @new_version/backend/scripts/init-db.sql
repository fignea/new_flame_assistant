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

-- Crear tabla de asistentes
CREATE TABLE IF NOT EXISTS assistants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    prompt TEXT,
    is_active BOOLEAN DEFAULT TRUE,
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

-- Triggers para actualizar updated_at automáticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_whatsapp_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_messages_updated_at BEFORE UPDATE ON scheduled_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_web_conversations_updated_at BEFORE UPDATE ON web_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar usuario de demostración por defecto
-- Email: admin@flame.com
-- Contraseña: flame123 (hash bcrypt)
INSERT INTO users (email, password, name) VALUES (
    'admin@flame.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- flame123
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