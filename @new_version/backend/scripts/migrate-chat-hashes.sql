-- Migración para agregar campo chat_hash a las tablas de contactos y mensajes
-- Esta migración permite usar hashes únicos alfanuméricos en lugar de los IDs de WhatsApp

-- Agregar campo chat_hash a la tabla contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS chat_hash VARCHAR(50) UNIQUE;

-- Agregar campo chat_hash a la tabla messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS chat_hash VARCHAR(50);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_contacts_chat_hash ON contacts(chat_hash);
CREATE INDEX IF NOT EXISTS idx_messages_chat_hash ON messages(chat_hash);

-- Crear función para generar hash único
CREATE OR REPLACE FUNCTION generate_chat_hash(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    result TEXT := '';
    hash_bytes BYTEA;
    i INTEGER;
BEGIN
    -- Generar hash SHA-256 del input
    hash_bytes := digest(input_text, 'sha256');
    
    -- Convertir hash a caracteres alfanuméricos (44 caracteres)
    FOR i IN 1..44 LOOP
        result := result || substr(chars, (get_byte(hash_bytes, (i-1) % 32) % 62) + 1, 1);
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Script para migrar datos existentes (ejecutar manualmente si es necesario)
-- UPDATE contacts SET chat_hash = generate_chat_hash(whatsapp_id || '_' || user_id::text) WHERE chat_hash IS NULL;
-- UPDATE messages SET chat_hash = (SELECT c.chat_hash FROM contacts c WHERE c.whatsapp_id = messages.chat_id AND c.user_id = messages.user_id) WHERE chat_hash IS NULL;
