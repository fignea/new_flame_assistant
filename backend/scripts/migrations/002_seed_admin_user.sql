-- Migración: Insertar usuario administrador por defecto
-- Esta migración se ejecuta solo si el usuario admin no existe

-- Insertar usuario administrador si no existe
INSERT INTO users (email, password_hash, name, role, is_active, created_at, updated_at) 
VALUES (
    'admin@flame.com', 
    '$2b$10$ay5sWz3Ofpbf564LjG7mUOxz85m0o7HUXq/szhGoZnRPOON1FVw6a', 
    'Admin User', 
    'admin', 
    true, 
    NOW(), 
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insertar asistente de ejemplo si no existe
INSERT INTO assistants (user_id, name, description, personality, greeting_message, model, temperature, max_tokens, is_active, created_at, updated_at)
SELECT 
    u.id,
    'Asistente General',
    'Asistente de IA general para conversaciones básicas',
    'Eres un asistente útil y amigable que siempre trata de ayudar a los usuarios de manera clara y concisa.',
    '¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?',
    'gpt-3.5-turbo',
    0.7,
    1000,
    true,
    NOW(),
    NOW()
FROM users u 
WHERE u.email = 'admin@flame.com' 
AND NOT EXISTS (
    SELECT 1 FROM assistants a 
    WHERE a.user_id = u.id 
    AND a.name = 'Asistente General'
);
