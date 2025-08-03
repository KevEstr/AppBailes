/**
 * Utilidades para el manejo de números de teléfono
 */

/**
 * Formatea un número de teléfono para mostrar en el frontend (sin código de país)
 * @param phone - Número de teléfono con o sin código de país
 * @returns Número de teléfono sin código de país
 */
export const formatPhoneForDisplay = (phone: string | null | undefined): string => {
  if (!phone) return ''
  
  // Remover todos los caracteres que no sean números
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Si empieza con 57 y tiene 12 dígitos, remover el código de país
  if (cleanPhone.startsWith('57') && cleanPhone.length === 12) {
    return cleanPhone.slice(2)
  }
  
  // Si tiene 11 dígitos y empieza con 57, remover el código de país
  if (cleanPhone.startsWith('57') && cleanPhone.length === 11) {
    return cleanPhone.slice(2)
  }
  
  // Si no tiene código de país, retornar como está
  return cleanPhone
}

/**
 * Formatea un número de teléfono para guardar en la base de datos (con código de país)
 * @param phone - Número de teléfono sin código de país
 * @returns Número de teléfono con código de país +57
 */
export const formatPhoneForStorage = (phone: string): string => {
  // Remover todos los caracteres que no sean números
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Si ya tiene código de país, retornar como está
  if (cleanPhone.startsWith('57') && cleanPhone.length === 12) {
    return `${cleanPhone}`
  }
  
  // Si tiene 10 dígitos, agregar código de país
  if (cleanPhone.length === 10) {
    return `57${cleanPhone}`
  }
  
  // Si tiene 11 dígitos y empieza con 3, agregar código de país
  if (cleanPhone.length === 11 && cleanPhone.startsWith('3')) {
    return `57${cleanPhone}`
  }
  
  // Si no cumple con el formato esperado, retornar como está
  return phone
}

/**
 * Valida que un número de teléfono tenga el formato correcto (10 dígitos)
 * @param phone - Número de teléfono a validar
 * @returns true si el formato es válido
 */
export const isValidPhoneFormat = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '')
  return /^\d{10}$/.test(cleanPhone)
} 