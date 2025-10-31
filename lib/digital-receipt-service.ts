import { prisma } from '@/lib/prisma';
import { calculatePaymentPeriodForConcept } from '@/lib/period-calculator';
import { toZonedTime } from 'date-fns-tz';

export interface ReceiptData {
  id: number;
  receiptNumber: string;
  studentName: string;
  amount: number;
  concept: string;
  paymentDate: string;
  nextPaymentDate?: string;
  paymentMethod: string;
  receivedBy: string;
  sport?: 'DANCE' | 'VOLLEYBALL'; // Campo para determinar el tipo de recibo
  additionalPayments?: {
    type: string;
    amount: number;
    concept: string;
    sport?: string;
  }[];
}

export class DigitalReceiptService {
  /**
   * Crea un recibo digital cuando se aprueba un pago mensual
   */
  static async createReceiptFromMonthlyPayment(
    monthlyPaymentId: number,
    approvedAmount: number,
    paymentMethod: string,
    reviewedBy: string,
    additionalPayments?: {
      type: string;
      amount: number;
      paymentMethod?: string;
    }[]
  ): Promise<ReceiptData> {
    try {
      // Obtener información del pago mensual
      const monthlyPayment = await prisma.monthlyPayment.findUnique({
        where: { id: monthlyPaymentId },
        include: {
          student: {
            include: {
              classEnrollments: {
                include: {
                  danceClass: {
                    select: { sport: true }
                  }
                }
              }
            }
          },
          period: true
        }
      });

      if (!monthlyPayment) {
        throw new Error('Pago mensual no encontrado');
      }

      // Determinar el deporte del estudiante
      const sport = this.pickPrimarySport(monthlyPayment.student);

      // Obtener el día de corte de la clase específica
      let cutoffDay = 30; // Default
      if (monthlyPayment.classId) {
        const enrollment = await prisma.classEnrollment.findFirst({
          where: {
            studentId: monthlyPayment.studentId,
            classId: monthlyPayment.classId,
            isActive: true
          },
          select: { paymentCutoffDay: true }
        });
        cutoffDay = enrollment?.paymentCutoffDay || 30;
      }
      
      console.log(`🔍 Debug para recibo digital pago ${monthlyPayment.id}:`);
      console.log(`   - StudentId: ${monthlyPayment.studentId}`);
      console.log(`   - ClassId: ${monthlyPayment.classId}`);
      console.log(`   - CutoffDay calculado: ${cutoffDay}`);
      
      // Calcular el período correcto para el concepto basado en el día de corte
      const periodInfo = calculatePaymentPeriodForConcept(
        cutoffDay, 
        monthlyPayment.period.year, 
        monthlyPayment.period.month
      );
      console.log(`   - Payment period reference: ${monthlyPayment.period.year}-${monthlyPayment.period.month}`);
      console.log(`   - Period info calculated: ${periodInfo.periodName}`);

      // Calcular fecha del próximo pago basada en el día de corte de la clase
      // Usar zona horaria de Colombia para evitar problemas de desfase
      const TZ = 'America/Bogota';
      const currentDate = new Date(monthlyPayment.period.year, monthlyPayment.period.month - 1, 1);
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      // Calcular año, mes y día del próximo pago
      const nextYear = nextMonth.getFullYear();
      const nextMonthNum = nextMonth.getMonth() + 1;
      
      // Crear la fecha directamente usando los componentes para evitar problemas de zona horaria
      // Usamos las 17:00 UTC (12:00 Colombia) para asegurar que siempre estemos en el día correcto
      // Colombia está en UTC-5, entonces 17:00 UTC = 12:00 Colombia
      const nextPaymentDateUTC = new Date(Date.UTC(nextYear, nextMonthNum - 1, cutoffDay, 17, 0, 0));
      
      // Convertir a zona horaria de Colombia para formatear correctamente
      const nextPaymentDateZoned = toZonedTime(nextPaymentDateUTC, TZ);
      const day = nextPaymentDateZoned.getDate().toString().padStart(2, '0');
      const month = (nextPaymentDateZoned.getMonth() + 1).toString().padStart(2, '0');
      const year = nextPaymentDateZoned.getFullYear();
      const nextPaymentDateFormatted = `${day}/${month}/${year}`;
      
      console.log(`🔍 Debug cálculo de fecha próximo pago:`);
      console.log(`   - Period year: ${monthlyPayment.period.year}`);
      console.log(`   - Period month: ${monthlyPayment.period.month}`);
      console.log(`   - Next year: ${nextYear}, Next month: ${nextMonthNum}, Cutoff day: ${cutoffDay}`);
      console.log(`   - Next payment date (UTC): ${nextPaymentDateUTC.toISOString()}`);
      console.log(`   - Next payment date (zoned): ${nextPaymentDateZoned.toISOString()}`);
      console.log(`   - Next payment date (formatted): ${nextPaymentDateFormatted}`);

      // Calcular monto total (mensualidad + adicional, sin detalles)
      const additionalTotal = (additionalPayments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const totalAmount = approvedAmount + additionalTotal;

      // Crear recibo en la base de datos con el total (mensualidad + adicional)
      const additionalMethodNote = (additionalPayments && additionalPayments[0]?.paymentMethod)
        ? ` | Inscripción vía ${this.getPaymentMethodLabel(additionalPayments[0].paymentMethod)}`
        : '';

      const receipt = await prisma.receipt.create({
        data: {
          studentId: monthlyPayment.studentId,
          monthlyPaymentId: monthlyPaymentId,
          amount: totalAmount,
          concept: '',
          paymentMethod: this.mapPaymentMethod(paymentMethod),
          notes: `Pago aprobado por ${reviewedBy}${additionalMethodNote}`,
          whatsappSent: false, // Se enviará por separado
        }
      });

      // Formatear datos del recibo
      const receiptData: ReceiptData = {
        id: receipt.id,
        receiptNumber: receipt.id.toString().padStart(4, '0'),
        studentName: monthlyPayment.student.name,
        amount: totalAmount, // Monto total incluyendo pagos adicionales
        concept: '',
        paymentDate: new Date().toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
        nextPaymentDate: nextPaymentDateFormatted,
        paymentMethod: this.getPaymentMethodLabel(paymentMethod),
        receivedBy: 'Sebastian Vasquez Correa',
        sport: sport || 'DANCE' // Default a DANCE si no se puede determinar
      };

      return receiptData;

    } catch (error) {
      console.error('Error creando recibo digital:', error);
      throw error;
    }
  }

  /**
   * Crea un recibo digital para cualquier pago
   */
  static async createReceiptFromGenericPayment(
    studentId: number,
    amount: number,
    concept: string,
    paymentMethod: string,
    notes?: string
  ): Promise<ReceiptData> {
    try {
      // Obtener información del estudiante
      const student = await prisma.student.findUnique({
        where: { id: studentId.toString() },
        include: {
          classEnrollments: {
            include: {
              danceClass: {
                select: { sport: true }
              }
            }
          }
        }
      });

      if (!student) {
        throw new Error('Estudiante no encontrado');
      }

      // Determinar el deporte del estudiante
      const sport = this.pickPrimarySport(student);

      // Crear recibo en la base de datos
      const receipt = await prisma.receipt.create({
        data: {
          studentId: studentId.toString(),
          amount,
          concept,
          paymentMethod: this.mapPaymentMethod(paymentMethod),
          notes: notes || '',
          whatsappSent: false,
        }
      });

      // Formatear datos del recibo
      const receiptData: ReceiptData = {
        id: receipt.id,
        receiptNumber: receipt.id.toString().padStart(4, '0'),
        studentName: student.name,
        amount,
        concept,
        paymentDate: new Date().toLocaleDateString('es-ES'),
        nextPaymentDate: concept.toLowerCase().includes('mensualidad') 
          ? new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString('es-ES')
          : undefined,
        paymentMethod: this.getPaymentMethodLabel(paymentMethod),
        receivedBy: 'Sebastian Vasquez Correa',
        sport: sport || 'DANCE' // Default a DANCE si no se puede determinar
      };

      return receiptData;

    } catch (error) {
      console.error('Error creando recibo digital:', error);
      throw error;
    }
  }

  /**
   * Obtiene un recibo por ID
   */
  static async getReceiptById(receiptId: number): Promise<ReceiptData | null> {
    try {
      const receipt = await prisma.receipt.findUnique({
        where: { id: receiptId },
        include: {
          student: {
            include: {
              classEnrollments: {
                include: {
                  danceClass: {
                    select: { sport: true }
                  }
                }
              }
            }
          }
        }
      });

      if (!receipt) {
        return null;
      }

      // Determinar el deporte del estudiante
      const sport = this.pickPrimarySport(receipt.student);

      const receiptData: ReceiptData = {
        id: receipt.id,
        receiptNumber: receipt.id.toString().padStart(4, '0'),
        studentName: receipt.student.name,
        amount: receipt.amount,
        concept: receipt.concept,
        paymentDate: new Date(receipt.createdAt).toLocaleDateString('es-ES'),
        nextPaymentDate: receipt.concept.toLowerCase().includes('mensualidad')
          ? new Date(new Date(receipt.createdAt).getTime() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString('es-ES')
          : undefined,
        paymentMethod: this.getPaymentMethodLabel(receipt.paymentMethod),
        receivedBy: 'Sebastian Vasquez Correa',
        sport: sport || 'DANCE' // Default a DANCE si no se puede determinar
      };

      return receiptData;

    } catch (error) {
      console.error('Error obteniendo recibo:', error);
      throw error;
    }
  }

  /**
   * Mapea método de pago a enum de Prisma
   */
  private static mapPaymentMethod(method: string): 'CASH' | 'TRANSFER' | 'CARD' {
    const methodMap: Record<string, 'CASH' | 'TRANSFER' | 'CARD'> = {
      'CASH': 'CASH',
      'TRANSFER': 'TRANSFER',
      'CARD': 'CARD',
      'efectivo': 'CASH',
      'transferencia': 'TRANSFER',
      'tarjeta': 'CARD',
      'nequi': 'TRANSFER',
      'daviplata': 'TRANSFER'
    };

    return methodMap[method] || 'CASH';
  }

  /**
   * Obtiene etiqueta legible del método de pago
   */
  private static getPaymentMethodLabel(method: string): string {
    const methodLabels: Record<string, string> = {
      'CASH': 'Efectivo',
      'TRANSFER': 'Transferencia',
      'CARD': 'Tarjeta',
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia',
      'tarjeta': 'Tarjeta',
      'nequi': 'Nequi',
      'daviplata': 'Daviplata'
    };

    return methodLabels[method] || 'Efectivo';
  }

  /**
   * Genera URL del recibo digital
   */
  static generateReceiptUrl(receiptId: number): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/recibo/${receiptId}`;
  }

  /**
   * Determina el deporte principal del estudiante
   * Prioriza DANCE sobre VOLLEYBALL si el estudiante está inscrito en ambos
   */
  private static pickPrimarySport(student: any): 'DANCE' | 'VOLLEYBALL' | null {
    if (!student.classEnrollments || student.classEnrollments.length === 0) return null;
    const sports = [...new Set(student.classEnrollments.map((enrollment: any) => enrollment.danceClass.sport))];
    if (sports.length === 0) return null;
    return (sports.includes('DANCE') ? 'DANCE' : sports[0]) as any;
  }
} 