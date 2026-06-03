import { prisma } from '@/lib/prisma';
import { calculatePaymentPeriodForConcept } from '@/lib/period-calculator';
import { logStep, withTimer } from '@/lib/ops-logger';
import { resolveCutoffDay } from '@/lib/payment-utils';

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
  ): Promise<ReceiptData>;
  static async createReceiptFromMonthlyPayment(
    monthlyPaymentId: number,
    approvedAmount: number,
    paymentMethod: string,
    reviewedBy: string,
    additionalPayments: {
      type: string;
      amount: number;
      paymentMethod?: string;
    }[] | undefined,
    opts: { correlationId?: string } | undefined
  ): Promise<ReceiptData>;
  static async createReceiptFromMonthlyPayment(
    monthlyPaymentId: number,
    approvedAmount: number,
    paymentMethod: string,
    reviewedBy: string,
    additionalPayments?: {
      type: string;
      amount: number;
      paymentMethod?: string;
    }[],
    opts?: { correlationId?: string }
  ): Promise<ReceiptData> {
    const correlationId = opts?.correlationId || `payment-${monthlyPaymentId}`;
    const t = withTimer();
    try {
      logStep({
        correlationId,
        scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
        step: 'start',
        verbose: true,
        data: {
          monthlyPaymentId,
          approvedAmount,
          paymentMethod,
          reviewedBy,
          additionalPaymentsCount: additionalPayments?.length || 0,
        },
      });

      // Obtener información del pago mensual
      const paymentLookupTimer = withTimer();
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
          danceClass: {
            select: { sport: true }
          },
          period: true
        }
      });
      logStep({
        correlationId,
        scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
        step: 'db.monthlyPayment.findUnique.done',
        verbose: true,
        data: {
          monthlyPaymentId,
          found: Boolean(monthlyPayment),
          ms: paymentLookupTimer.ms(),
          classId: monthlyPayment?.classId ?? null,
          studentId: monthlyPayment?.studentId ?? null,
        },
      });

      if (!monthlyPayment) {
        throw new Error('Pago mensual no encontrado');
      }

      // Determinar el deporte del recibo:
      // 1. Si el pago está asociado a una clase específica, usar el deporte de esa clase
      // 2. Si no, usar el deporte principal del estudiante (prioriza DANCE)
      let sport: 'DANCE' | 'VOLLEYBALL' | null = null;
      if (monthlyPayment.classId && monthlyPayment.danceClass) {
        // Usar el deporte de la clase específica del pago
        sport = monthlyPayment.danceClass.sport as 'DANCE' | 'VOLLEYBALL';
      } else {
        // Fallback: usar el deporte principal del estudiante
        sport = this.pickPrimarySport(monthlyPayment.student);
      }
      logStep({
        correlationId,
        scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
        step: 'sport.resolved',
        verbose: true,
        data: {
          monthlyPaymentId,
          classId: monthlyPayment.classId ?? null,
          sport: sport || null,
        },
      });

      // Obtener el día de corte de la clase específica
      let cutoffDay = 30; // Default
      if (monthlyPayment.classId) {
        const cutoffTimer = withTimer();
        cutoffDay = await resolveCutoffDay(monthlyPayment.studentId, monthlyPayment.classId);
        logStep({
          correlationId,
          scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
          step: 'cutoff.lookup.done',
          verbose: true,
          data: {
            monthlyPaymentId,
            classId: monthlyPayment.classId,
            cutoffDay,
            ms: cutoffTimer.ms(),
          },
        });
      }
      
      // Calcular el período correcto para el concepto basado en el día de corte
      const periodInfo = calculatePaymentPeriodForConcept(
        cutoffDay, 
        monthlyPayment.period.year, 
        monthlyPayment.period.month
      );
      logStep({
        correlationId,
        scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
        step: 'period.calculate.done',
        verbose: true,
        data: {
          monthlyPaymentId,
          cutoffDay,
          year: monthlyPayment.period.year,
          month: monthlyPayment.period.month,
          periodName: periodInfo.periodName,
        },
      });

      // Calcular fecha del próximo pago basada en el día de corte de la clase
      // Calcular directamente sin conversiones de zona horaria para evitar desfases
      const currentDate = new Date(monthlyPayment.period.year, monthlyPayment.period.month - 1, 1);
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      // Obtener año y mes del próximo mes
      const nextYear = nextMonth.getFullYear();
      const nextMonthNum = nextMonth.getMonth() + 1;
      
      // Formatear directamente usando los componentes calculados
      // Esto evita problemas de zona horaria ya que solo usamos año, mes y día
      const day = cutoffDay.toString().padStart(2, '0');
      const month = nextMonthNum.toString().padStart(2, '0');
      const year = nextYear.toString();
      const nextPaymentDateFormatted = `${day}/${month}/${year}`;
      
      // Calcular monto total (mensualidad + adicional, sin detalles)
      const additionalTotal = (additionalPayments || []).reduce((sum, payment) => sum + payment.amount, 0);
      const totalAmount = approvedAmount + additionalTotal;
      logStep({
        correlationId,
        scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
        step: 'amounts.totalCalculated',
        verbose: true,
        data: {
          monthlyPaymentId,
          approvedAmount,
          additionalTotal,
          totalAmount,
        },
      });

      // Crear recibo en la base de datos con el total (mensualidad + adicional)
      const additionalMethodNote = (additionalPayments && additionalPayments[0]?.paymentMethod)
        ? ` | Inscripción vía ${this.getPaymentMethodLabel(additionalPayments[0].paymentMethod)}`
        : '';

      const receiptCreateTimer = withTimer();
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
      logStep({
        correlationId,
        scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
        step: 'db.receipt.create.done',
        verbose: true,
        data: {
          monthlyPaymentId,
          receiptId: receipt.id,
          ms: receiptCreateTimer.ms(),
        },
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

      logStep({
        correlationId,
        scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
        step: 'done',
        verbose: true,
        data: {
          monthlyPaymentId,
          receiptId: receiptData.id,
          receiptNumber: receiptData.receiptNumber,
          receiptUrl: this.generateReceiptUrl(receiptData.id),
          totalMs: t.ms(),
        },
      });

      return receiptData;

    } catch (error) {
      logStep({
        correlationId,
        scope: 'DigitalReceiptService.createReceiptFromMonthlyPayment',
        step: 'error',
        level: 'error',
        data: {
          monthlyPaymentId,
          elapsedMs: t.ms(),
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
        },
      });
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
          },
          monthlyPayment: {
            include: {
              danceClass: {
                select: { sport: true }
              }
            }
          }
        }
      });

      if (!receipt) {
        return null;
      }

      // Determinar el deporte del recibo:
      // 1. Si el recibo está asociado a un pago mensual con clase específica, usar el deporte de esa clase
      // 2. Si no, usar el deporte principal del estudiante (prioriza DANCE)
      let sport: 'DANCE' | 'VOLLEYBALL' | null = null;
      if (receipt.monthlyPayment?.classId && receipt.monthlyPayment?.danceClass) {
        // Usar el deporte de la clase específica del pago mensual
        sport = receipt.monthlyPayment.danceClass.sport as 'DANCE' | 'VOLLEYBALL';
      } else {
        // Fallback: usar el deporte principal del estudiante
        sport = this.pickPrimarySport(receipt.student);
      }

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
   * 
   * NOTA: Este método se usa como fallback cuando no hay una clase específica asociada al pago.
   * Cuando hay un classId en el pago mensual, se debe usar el deporte de esa clase específica.
   */
  private static pickPrimarySport(student: any): 'DANCE' | 'VOLLEYBALL' | null {
    if (!student.classEnrollments || student.classEnrollments.length === 0) return null;
    const sports = [...new Set(student.classEnrollments.map((enrollment: any) => enrollment.danceClass.sport))];
    if (sports.length === 0) return null;
    return (sports.includes('DANCE') ? 'DANCE' : sports[0]) as any;
  }
} 