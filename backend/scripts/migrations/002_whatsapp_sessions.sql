-- Crear tabla para sesiones persistentes de WhatsApp Web
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    qr_code TEXT,
    is_connected BOOLEAN DEFAULT FALSE,
    is_authenticated BOOLEAN DEFAULT FALSE,
    phone_number VARCHAR(20),
    user_name VARCHAR(255),
    last_seen TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id ON whatsapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_id ON whatsapp_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires_at ON whatsapp_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_connected ON whatsapp_sessions(is_connected);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_whatsapp_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_whatsapp_sessions_updated_at ON whatsapp_sessions;
CREATE TRIGGER update_whatsapp_sessions_updated_at
    BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_sessions_updated_at();

-- Agregar comentarios a la tabla
COMMENT ON TABLE whatsapp_sessions IS 'Sesiones persistentes de WhatsApp Web';
COMMENT ON COLUMN whatsapp_sessions.session_id IS 'ID único de la sesión de WhatsApp Web';
COMMENT ON COLUMN whatsapp_sessions.qr_code IS 'Código QR en base64 para la autenticación';
COMMENT ON COLUMN whatsapp_sessions.is_connected IS 'Indica si la sesión está conectada';
COMMENT ON COLUMN whatsapp_sessions.is_authenticated IS 'Indica si la sesión está autenticada';
COMMENT ON COLUMN whatsapp_sessions.phone_number IS 'Número de teléfono de WhatsApp';
COMMENT ON COLUMN whatsapp_sessions.user_name IS 'Nombre del usuario en WhatsApp';
COMMENT ON COLUMN whatsapp_sessions.expires_at IS 'Fecha de expiración de la sesión';
