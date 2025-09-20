-- Migración de verificación: Verificar que las tablas existan y tengan la estructura correcta
-- Esta migración se ejecuta primero para verificar el estado actual

-- Verificar si las tablas existen
DO $$ 
BEGIN
    -- Verificar tabla users
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE NOTICE 'Tabla users no existe, será creada en la siguiente migración';
    ELSE
        RAISE NOTICE 'Tabla users existe';
        
        -- Verificar columnas de users
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
            ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
            RAISE NOTICE 'Columna is_active agregada a users';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
            ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
            RAISE NOTICE 'Columna role agregada a users';
        END IF;
    END IF;
    
    -- Verificar tabla assistants
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistants') THEN
        RAISE NOTICE 'Tabla assistants no existe, será creada en la siguiente migración';
    ELSE
        RAISE NOTICE 'Tabla assistants existe';
    END IF;
    
    -- Verificar tabla conversations
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        RAISE NOTICE 'Tabla conversations no existe, será creada en la siguiente migración';
    ELSE
        RAISE NOTICE 'Tabla conversations existe';
    END IF;
    
    -- Verificar tabla messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        RAISE NOTICE 'Tabla messages no existe, será creada en la siguiente migración';
    ELSE
        RAISE NOTICE 'Tabla messages existe';
    END IF;
    
    -- Verificar tabla integrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
        RAISE NOTICE 'Tabla integrations no existe, será creada en la siguiente migración';
    ELSE
        RAISE NOTICE 'Tabla integrations existe';
    END IF;
    
    -- Verificar tabla schedules
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedules') THEN
        RAISE NOTICE 'Tabla schedules no existe, será creada en la siguiente migración';
    ELSE
        RAISE NOTICE 'Tabla schedules existe';
    END IF;
    
END $$;
