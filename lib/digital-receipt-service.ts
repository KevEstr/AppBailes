import { prisma } from '@/lib/prisma';

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
}

export class DigitalReceiptService {
  /**
   * Crea un recibo digital cuando se aprueba un pago mensual
   */
  static async createReceiptFromMonthlyPayment(
    monthlyPaymentId: number,
    approvedAmount: number,
    paymentMethod: string,
    reviewedBy: string
  ): Promise<ReceiptData> {
    try {
      // Obtener información del pago mensual
      const monthlyPayment = await prisma.monthlyPayment.findUnique({
        where: { id: monthlyPaymentId },
        include: {
          student: true,
          period: true
        }
      });

      if (!monthlyPayment) {
        throw new Error('Pago mensual no encontrado');
      }

      // Crear recibo en la base de datos
      const receipt = await prisma.receipt.create({
        data: {
          studentId: monthlyPayment.studentId,
          amount: approvedAmount,
          concept: `Mensualidad ${monthlyPayment.period.name}`,
          paymentMethod: this.mapPaymentMethod(paymentMethod),
          notes: `Pago aprobado por ${reviewedBy}`,
          whatsappSent: false, // Se enviará por separado
        }
      });

      // Formatear datos del recibo
      const receiptData: ReceiptData = {
        id: receipt.id,
        receiptNumber: receipt.id.toString().padStart(4, '0'),
        studentName: monthlyPayment.student.name,
        amount: approvedAmount,
        concept: `Mensualidad ${monthlyPayment.period.name}`,
        paymentDate: new Date().toLocaleDateString('es-ES'),
        nextPaymentDate: new Date(monthlyPayment.period.dueDate.getTime() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString('es-ES'),
        paymentMethod: this.getPaymentMethodLabel(paymentMethod),
        receivedBy: 'Sebastian Vasquez Correa'
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
        where: { id: studentId }
      });

      if (!student) {
        throw new Error('Estudiante no encontrado');
      }

      // Crear recibo en la base de datos
      const receipt = await prisma.receipt.create({
        data: {
          studentId,
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
          ? new Date(new Date().getTime() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString('es-ES')
          : undefined,
        paymentMethod: this.getPaymentMethodLabel(paymentMethod),
        receivedBy: 'Sebastian Vasquez Correa'
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
          student: true
        }
      });

      if (!receipt) {
        return null;
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
        receivedBy: 'Sebastian Vasquez Correa'
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
} 