/**
 * Este archivo ya no es necesario.
 * La base de datos maneja automáticamente la zona horaria de Colombia.
 * Use date-fns directamente para formatear fechas según necesite.
 */

// Si necesita formatear fechas, use:
// import { format, parseISO } from 'date-fns';
// import { es } from 'date-fns/locale';
// format(fecha, 'dd/MM/yyyy HH:mm', { locale: es }); 

// ================================================
// Utilidades para manejo de fechas sin conversión de zona horaria
// ================================================

/**
 * Extrae los componentes de fecha y hora de un string ISO sin crear objetos Date
 * para evitar conversiones automáticas de zona horaria
 */
export function parseISODateString(dateString: string): {
  year: string;
  month: string;
  day: string;
  hours: string;
  minutes: string;
  seconds?: string;
} | null {
  try {
    // Manejar diferentes formatos de fecha ISO
    let cleanDateString = dateString;
    
    // Si tiene zona horaria, removerla para extraer solo la fecha/hora
    if (dateString.includes('T')) {
      const [dateTimePart] = dateString.split('T');
      const timePart = dateString.split('T')[1]?.split(/[+-]/)[0]; // Remover zona horaria
      cleanDateString = `${dateTimePart}T${timePart}`;
    }
    
    // Parsear la fecha ISO
    const [datePart, timePart] = cleanDateString.split('T');
    if (!datePart) return null;
    
    const [year, month, day] = datePart.split('-');
    if (!timePart) {
      return { year, month, day, hours: '00', minutes: '00' };
    }
    
    const [hours, minutes, seconds] = timePart.split(':');
    return {
      year,
      month,
      day,
      hours,
      minutes,
      seconds
    };
  } catch (error) {
    console.error('Error parsing ISO date string:', error);
    return null;
  }
}

/**
 * Formatea una fecha ISO como DD/MM/YYYY HH:mm sin conversión de zona horaria
 */
export function formatDateWithoutTimezone(dateString: string): string {
  const parsed = parseISODateString(dateString);
  if (!parsed) return dateString;
  
  return `${parsed.day}/${parsed.month}/${parsed.year} ${parsed.hours}:${parsed.minutes}`;
}

/**
 * Formatea una fecha ISO como DD/MM/YYYY sin conversión de zona horaria
 */
export function formatDateOnlyWithoutTimezone(dateString: string): string {
  const parsed = parseISODateString(dateString);
  if (!parsed) return dateString;
  
  return `${parsed.day}/${parsed.month}/${parsed.year}`;
}

/**
 * Formatea una fecha ISO como "DD de MMMM de YYYY" en español sin conversión de zona horaria
 */
export function formatDateLongWithoutTimezone(dateString: string): string {
  const parsed = parseISODateString(dateString);
  if (!parsed) return dateString;
  
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  
  const monthName = months[parseInt(parsed.month) - 1];
  return `${parsed.day} de ${monthName} de ${parsed.year}`;
}

/**
 * Formatea una fecha ISO como "DD MMM YYYY" sin conversión de zona horaria
 */
export function formatDateShortWithoutTimezone(dateString: string): string {
  const parsed = parseISODateString(dateString);
  if (!parsed) return dateString;
  
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"
  ];
  
  const monthName = months[parseInt(parsed.month) - 1];
  return `${parsed.day} ${monthName} ${parsed.year}`;
}

/**
 * Formatea solo la hora de una fecha ISO como HH:mm sin conversión de zona horaria
 */
export function formatTimeWithoutTimezone(dateString: string): string {
  const parsed = parseISODateString(dateString);
  if (!parsed) return dateString;
  
  return `${parsed.hours}:${parsed.minutes}`;
}

/**
 * Convierte una fecha local a ISO string para envío al servidor
 * Asume que la fecha está en zona horaria local de Colombia
 */
export function localDateToISOString(date: Date): string {
  // Crear una fecha ISO en la zona horaria local sin conversión
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000-05:00`;
} 