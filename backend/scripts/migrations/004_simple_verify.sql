-- Migración simple: Solo verificar que el esquema esté en orden
-- Esta migración no hace cambios, solo verifica

DO $$ 
BEGIN
    -- Verificar que la tabla users existe y tiene las columnas necesarias
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Tabla users no existe';
    END IF;
    
    -- Verificar columnas esenciales
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') THEN
        RAISE EXCEPTION 'Columna id no existe en users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
        RAISE EXCEPTION 'Columna email no existe en users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password_hash') THEN
        RAISE EXCEPTION 'Columna password_hash no existe en users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'name') THEN
        RAISE EXCEPTION 'Columna name no existe en users';
    END IF;
    
    -- Verificar que las otras tablas existan
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assistants') THEN
        RAISE EXCEPTION 'Tabla assistants no existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        RAISE EXCEPTION 'Tabla conversations no existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        RAISE EXCEPTION 'Tabla messages no existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integrations') THEN
        RAISE EXCEPTION 'Tabla integrations no existe';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedules') THEN
        RAISE EXCEPTION 'Tabla schedules no existe';
    END IF;
    
    RAISE NOTICE 'Verificación del esquema completada exitosamente - todas las tablas y columnas existen';
    
END $$;
