/**
 * Utilidades para calcular períodos de pago basados en días de corte por clase
 */

export interface PeriodInfo {
  periodName: string;
  dueDate: string;
  cutoffDay: number;
  periodMonth: number;
  periodYear: number;
}

/**
 * Calcula el período de pago basado en el día de corte de la clase
 * - Si el corte es el 15: está pagando el mes actual del período
 * - Si el corte es el 30: está pagando el mes siguiente del período
 * @param cutoffDay Día de corte de la clase (15 o 30)
 * @param referenceDate Fecha de referencia (por defecto: fecha actual)
 * @returns Información del período calculado
 */
export function calculatePeriodForClass(
  cutoffDay: number, 
  referenceDate: Date = new Date()
): PeriodInfo {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;
  const currentDay = referenceDate.getDate();
  
  console.log(`📅 calculatePeriodForClass - Input: cutoffDay=${cutoffDay}, referenceDate=${referenceDate.toISOString()}`);
  console.log(`📅 calculatePeriodForClass - Current: day=${currentDay}, month=${currentMonth}, year=${currentYear}`);
  
  // Determinar el mes del período basado en el día de corte
  let periodMonth = currentMonth;
  let periodYear = currentYear;
  
  if (cutoffDay === 15) {
    // Si el corte es el 15, está pagando el mes actual del período
    periodMonth = currentMonth;
    periodYear = currentYear;
  } else if (cutoffDay === 30) {
    // Si el corte es el 30, está pagando el mes siguiente del período
    periodMonth = currentMonth + 1;
    if (periodMonth > 12) {
      periodMonth = 1;
      periodYear = currentYear + 1;
    }
  } else {
    // Para otros días de corte, usar lógica anterior como fallback
    if (currentDay < cutoffDay) {
      periodMonth = currentMonth;
      periodYear = currentYear;
    } else {
      periodMonth = currentMonth + 1;
      if (periodMonth > 12) {
        periodMonth = 1;
        periodYear = currentYear + 1;
      }
    }
  }
  
  // Formatear el período con el día de corte
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const periodName = `${cutoffDay} de ${monthNames[periodMonth - 1]} ${periodYear}`;
  
  console.log(`📅 calculatePeriodForClass - Period calculated: ${periodName}`);
  
  // Calcular fecha de vencimiento basada en el día de corte
  let dueMonth = periodMonth;
  let dueYear = periodYear;
  
  if (cutoffDay === 15) {
    // Para corte del 15, vence el 20 del mismo mes
    dueMonth = periodMonth;
    dueYear = periodYear;
  } else if (cutoffDay === 30) {
    // Para corte del 30, vence el 5 del mes siguiente
    dueMonth = periodMonth + 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear = periodYear + 1;
    }
  }
  
  const dueDay = cutoffDay === 15 ? 20 : 5;
  const dueDate = new Date(dueYear, dueMonth - 1, dueDay).toLocaleDateString('es-ES');
  
  console.log(`📅 calculatePeriodForClass - Due date calculated: ${dueDate} (day ${dueDay} of month ${dueMonth})`);
  
  const result = {
    periodName,
    dueDate,
    cutoffDay,
    periodMonth,
    periodYear
  };
  
  console.log(`📅 calculatePeriodForClass - Final result:`, result);
  
  return result;
}

/**
 * Calcula el período para un pago específico basado en su fecha de creación y día de corte
 * @param paymentDate Fecha de creación del pago
 * @param cutoffDay Día de corte de la clase
 * @returns Información del período calculado
 */
export function calculatePeriodForPayment(
  paymentDate: Date,
  cutoffDay: number
): PeriodInfo {
  return calculatePeriodForClass(cutoffDay, paymentDate);
}

/**
 * Calcula el período correcto para el concepto del pago basado en el día de corte
 * - Si el corte es el 15: está pagando el mes actual del período
 * - Si el corte es el 30: está pagando el mes siguiente del período
 * @param cutoffDay Día de corte de la clase (15 o 30)
 * @param paymentPeriodYear Año del período del pago
 * @param paymentPeriodMonth Mes del período del pago
 * @returns Información del período calculado para el concepto
 */
export function calculatePaymentPeriodForConcept(
  cutoffDay: number,
  paymentPeriodYear: number,
  paymentPeriodMonth: number
): PeriodInfo {
  console.log(`📅 calculatePaymentPeriodForConcept - Input: cutoffDay=${cutoffDay}, paymentPeriod=${paymentPeriodYear}-${paymentPeriodMonth}`);
  
  let conceptMonth = paymentPeriodMonth;
  let conceptYear = paymentPeriodYear;
  
  if (cutoffDay === 15) {
    // Si el corte es el 15, está pagando el mes actual del período
    conceptMonth = paymentPeriodMonth;
    conceptYear = paymentPeriodYear;
  } else if (cutoffDay === 30) {
    // Si el corte es el 30, está pagando el mes siguiente del período
    conceptMonth = paymentPeriodMonth + 1;
    if (conceptMonth > 12) {
      conceptMonth = 1;
      conceptYear = paymentPeriodYear + 1;
    }
  } else {
    // Para otros días de corte, usar el mes actual del período
    conceptMonth = paymentPeriodMonth;
    conceptYear = paymentPeriodYear;
  }
  
  // Formatear el período con el día de corte
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const periodName = `${monthNames[conceptMonth - 1]} ${conceptYear}`;
  
  console.log(`📅 calculatePaymentPeriodForConcept - Concept calculated: ${periodName}`);
  
  // Calcular fecha de vencimiento basada en el día de corte
  let dueMonth = conceptMonth;
  let dueYear = conceptYear;
  
  if (cutoffDay === 15) {
    // Para corte del 15, vence el 20 del mismo mes
    dueMonth = conceptMonth;
    dueYear = conceptYear;
  } else if (cutoffDay === 30) {
    // Para corte del 30, vence el 5 del mes siguiente
    dueMonth = conceptMonth + 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear = conceptYear + 1;
    }
  }
  
  const dueDay = cutoffDay === 15 ? 20 : 5;
  const dueDate = new Date(dueYear, dueMonth - 1, dueDay).toLocaleDateString('es-ES');
  
  console.log(`📅 calculatePaymentPeriodForConcept - Due date calculated: ${dueDate} (day ${dueDay} of month ${dueMonth})`);
  
  const result = {
    periodName,
    dueDate,
    cutoffDay,
    periodMonth: conceptMonth,
    periodYear: conceptYear
  };
  
  console.log(`📅 calculatePaymentPeriodForConcept - Final result:`, result);
  
  return result;
}

/**
 * Obtiene el nombre del mes en español
 * @param monthNumber Número del mes (1-12)
 * @returns Nombre del mes en español
 */
export function getMonthName(monthNumber: number): string {
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  return monthNames[monthNumber - 1] || 'Mes inválido';
}
