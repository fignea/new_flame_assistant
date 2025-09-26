-- Script de migración para actualizar la tabla messages
-- Este script actualiza la estructura de la tabla messages para que coincida con el código

-- Primero, verificar si la columna whatsapp_message_id ya existe
DO $$
BEGIN
    -- Si la columna whatsapp_message_id no existe, la creamos
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'whatsapp_message_id'
    ) THEN
        -- Renombrar message_id a whatsapp_message_id si existe
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'messages' 
            AND column_name = 'message_id'
        ) THEN
            ALTER TABLE messages RENAME COLUMN message_id TO whatsapp_message_id;
        ELSE
            -- Si no existe ninguna de las dos, crear whatsapp_message_id
            ALTER TABLE messages ADD COLUMN whatsapp_message_id VARCHAR(255);
        END IF;
    END IF;
END $$;

-- Agregar columnas que faltan si no existen
DO $$
BEGIN
    -- Agregar contact_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'contact_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;
    END IF;

    -- Agregar status si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE messages ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
    END IF;

    -- Agregar media_url si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'media_url'
    ) THEN
        ALTER TABLE messages ADD COLUMN media_url TEXT;
    END IF;

    -- Hacer content NOT NULL si no lo es
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'content'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE messages ALTER COLUMN content SET NOT NULL;
    END IF;

    -- Hacer timestamp NOT NULL si no lo es
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'timestamp'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE messages ALTER COLUMN timestamp SET NOT NULL;
    END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_messages_whatsapp_message_id ON messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);

-- Actualizar registros existentes que puedan tener valores NULL
UPDATE messages SET status = 'delivered' WHERE status IS NULL;
UPDATE messages SET content = '[Empty Message]' WHERE content IS NULL OR content = '';

COMMIT;
