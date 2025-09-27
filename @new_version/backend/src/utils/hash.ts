import crypto from 'crypto';

/**
 * Genera un hash único alfanumérico para identificadores de chat
 * Similar al estilo de Google: EgZjaHJvbWUyBggAEEUYOdIBCDEzMjhqMGo3qAIAsAIA
 * @param length Longitud del hash (por defecto 44 caracteres)
 * @returns Hash alfanumérico único
 */
export function generateChatHash(length: number = 44): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Generar bytes aleatorios
  const randomBytes = crypto.randomBytes(length);
  
  // Convertir bytes a caracteres alfanuméricos
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Genera un hash único basado en el contenido (determinístico)
 * Útil para generar el mismo hash para el mismo whatsapp_id
 * @param input String de entrada (ej: whatsapp_id)
 * @param length Longitud del hash (por defecto 44 caracteres)
 * @returns Hash alfanumérico determinístico
 */
export function generateDeterministicHash(input: string, length: number = 44): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  // Crear hash SHA-256 del input
  const hash = crypto.createHash('sha256').update(input).digest();
  
  // Convertir hash a caracteres alfanuméricos
  for (let i = 0; i < length; i++) {
    result += chars[hash[i % hash.length] % chars.length];
  }
  
  return result;
}

/**
 * Genera un hash único para un chat de WhatsApp
 * Combina el whatsapp_id con un timestamp para garantizar unicidad
 * @param whatsappId ID de WhatsApp (ej: 5491138208331@s.whatsapp.net)
 * @param userId ID del usuario
 * @returns Hash único para el chat
 */
export function generateChatHashForWhatsApp(whatsappId: string, userId: number): string {
  const input = `${whatsappId}_${userId}_${Date.now()}`;
  return generateDeterministicHash(input, 44);
}

/**
 * Valida si un string es un hash válido de chat
 * @param hash String a validar
 * @returns true si es un hash válido
 */
export function isValidChatHash(hash: string): boolean {
  // Debe ser alfanumérico y tener longitud entre 20 y 50 caracteres
  const hashRegex = /^[A-Za-z0-9]{20,50}$/;
  return hashRegex.test(hash);
}
