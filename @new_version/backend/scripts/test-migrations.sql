-- Script de prueba para verificar las migraciones del sistema de asistentes
-- Ejecutar después de migrate-assistant-system.sql

-- ========================================
-- VERIFICAR NUEVAS TABLAS
-- ========================================

-- Verificar que las nuevas tablas existen
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'assistant_assignments',
            'response_templates', 
            'tags',
            'conversation_tags',
            'interaction_history',
            'contact_notes',
            'assistant_configs'
        ) THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'assistant_assignments',
    'response_templates', 
    'tags',
    'conversation_tags',
    'interaction_history',
    'contact_notes',
    'assistant_configs'
)
ORDER BY table_name;

-- ========================================
-- VERIFICAR CAMPOS NUEVOS EN TABLAS EXISTENTES
-- ========================================

-- Verificar campos nuevos en tabla contacts
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('avatar_url', 'is_blocked', 'last_interaction', 'interaction_count') 
        THEN '✅ NUEVO CAMPO'
        ELSE '⚠️ CAMPO EXISTENTE'
    END as status
FROM information_schema.columns 
WHERE table_name = 'contacts' 
AND column_name IN ('avatar_url', 'is_blocked', 'last_interaction', 'interaction_count')
ORDER BY column_name;

-- Verificar campos nuevos en tabla assistants
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('openai_api_key', 'model', 'max_tokens', 'temperature', 'auto_assign', 'response_delay') 
        THEN '✅ NUEVO CAMPO'
        ELSE '⚠️ CAMPO EXISTENTE'
    END as status
FROM information_schema.columns 
WHERE table_name = 'assistants' 
AND column_name IN ('openai_api_key', 'model', 'max_tokens', 'temperature', 'auto_assign', 'response_delay')
ORDER BY column_name;

-- Verificar campos nuevos en tabla messages
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name IN ('assistant_id', 'is_auto_response', 'template_id') 
        THEN '✅ NUEVO CAMPO'
        ELSE '⚠️ CAMPO EXISTENTE'
    END as status
FROM information_schema.columns 
WHERE table_name = 'messages' 
AND column_name IN ('assistant_id', 'is_auto_response', 'template_id')
ORDER BY column_name;

-- ========================================
-- VERIFICAR ÍNDICES
-- ========================================

-- Verificar índices de nuevas tablas
SELECT 
    indexname,
    tablename,
    CASE 
        WHEN indexname LIKE 'idx_%' 
        THEN '✅ ÍNDICE CREADO'
        ELSE '❌ ÍNDICE FALTANTE'
    END as status
FROM pg_indexes 
WHERE tablename IN (
    'assistant_assignments',
    'response_templates', 
    'tags',
    'conversation_tags',
    'interaction_history',
    'contact_notes',
    'assistant_configs'
)
ORDER BY tablename, indexname;

-- ========================================
-- VERIFICAR TRIGGERS
-- ========================================

-- Verificar triggers de updated_at
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    CASE 
        WHEN trigger_name LIKE 'update_%_updated_at' 
        THEN '✅ TRIGGER ACTIVO'
        ELSE '❌ TRIGGER FALTANTE'
    END as status
FROM information_schema.triggers 
WHERE event_object_table IN (
    'assistants',
    'assistant_assignments',
    'response_templates', 
    'tags',
    'contact_notes',
    'assistant_configs'
)
AND trigger_name LIKE 'update_%_updated_at'
ORDER BY event_object_table, trigger_name;

-- ========================================
-- VERIFICAR DATOS DE DEMOSTRACIÓN
-- ========================================

-- Verificar etiquetas de demostración
SELECT 
    'Etiquetas de demostración' as test,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ DATOS CREADOS'
        ELSE '❌ DATOS FALTANTES'
    END as status
FROM tags 
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@flame.com');

-- Verificar plantillas de demostración
SELECT 
    'Plantillas de demostración' as test,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ DATOS CREADOS'
        ELSE '❌ DATOS FALTANTES'
    END as status
FROM response_templates 
WHERE assistant_id = (SELECT id FROM assistants WHERE name = 'Asistente General');

-- Verificar configuración de demostración
SELECT 
    'Configuración de demostración' as test,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) >= 4 THEN '✅ DATOS CREADOS'
        ELSE '❌ DATOS FALTANTES'
    END as status
FROM assistant_configs 
WHERE assistant_id = (SELECT id FROM assistants WHERE name = 'Asistente General');

-- ========================================
-- PRUEBAS DE INTEGRIDAD
-- ========================================

-- Verificar integridad referencial
SELECT 
    'Integridad referencial' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_type = 'FOREIGN KEY' 
            AND table_name IN (
                'assistant_assignments',
                'response_templates', 
                'conversation_tags',
                'interaction_history',
                'contact_notes',
                'assistant_configs'
            )
        ) THEN '✅ FOREIGN KEYS CREADAS'
        ELSE '❌ FOREIGN KEYS FALTANTES'
    END as status;

-- ========================================
-- RESUMEN DE VERIFICACIÓN
-- ========================================

SELECT 
    'RESUMEN DE MIGRACIÓN' as test,
    'Verificar que todos los tests anteriores muestren ✅' as message,
    'Si hay ❌, revisar los logs de migración' as action;

-- ========================================
-- CONSULTAS DE PRUEBA
-- ========================================

-- Probar consulta básica de asistentes con nuevos campos
SELECT 
    id,
    name,
    model,
    auto_assign,
    response_delay,
    created_at
FROM assistants 
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@flame.com')
LIMIT 5;

-- Probar consulta de etiquetas
SELECT 
    id,
    name,
    color,
    created_at
FROM tags 
WHERE user_id = (SELECT id FROM users WHERE email = 'admin@flame.com')
ORDER BY name;

-- Probar consulta de plantillas
SELECT 
    rt.id,
    rt.name,
    rt.trigger_keywords,
    a.name as assistant_name
FROM response_templates rt
JOIN assistants a ON rt.assistant_id = a.id
WHERE a.user_id = (SELECT id FROM users WHERE email = 'admin@flame.com')
ORDER BY rt.name;

-- ========================================
-- LIMPIEZA (OPCIONAL - SOLO PARA TESTING)
-- ========================================

-- Descomentar las siguientes líneas si quieres limpiar los datos de prueba
-- DELETE FROM assistant_configs WHERE assistant_id = (SELECT id FROM assistants WHERE name = 'Asistente General');
-- DELETE FROM response_templates WHERE assistant_id = (SELECT id FROM assistants WHERE name = 'Asistente General');
-- DELETE FROM tags WHERE user_id = (SELECT id FROM users WHERE email = 'admin@flame.com');
