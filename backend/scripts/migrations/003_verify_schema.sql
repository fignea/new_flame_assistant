-- Migración de verificación: Verificar que el esquema esté completo
-- Esta migración se ejecuta para verificar que todas las tablas y columnas existan

DO $$ 
BEGIN
    -- Verificar que la tabla users tenga todas las columnas necesarias
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna is_active agregada a users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
        RAISE NOTICE 'Columna role agregada a users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
        RAISE NOTICE 'Columna avatar_url agregada a users';
    END IF;
    
    -- Verificar que existan los índices necesarios
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_email') THEN
        CREATE INDEX idx_users_email ON users(email);
        RAISE NOTICE 'Índice idx_users_email creado';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'users' AND indexname = 'idx_users_active') THEN
        CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
        RAISE NOTICE 'Índice idx_users_active creado';
    END IF;
    
    RAISE NOTICE 'Verificación del esquema completada exitosamente';
    
END $$;
