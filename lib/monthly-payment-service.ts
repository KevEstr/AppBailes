import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/utils';

export class MonthlyPaymentService {
  
  // ========== CONFIGURACIÓN DE MENSUALIDADES ==========
  
  /**
   * Establece el valor de la mensualidad
   */
  async setMonthlyFee(data: {
    amount: number;
    description?: string;
    createdBy: string;
    validFrom?: Date;
  }) {
    // Desactivar configuración anterior
    await prisma.monthlyFeeConfig.updateMany({
      where: { isActive: true },
      data: { 
        isActive: false,
        validUntil: new Date()
      }
    });

    // Crear nueva configuración
    return await prisma.monthlyFeeConfig.create({
      data: {
        amount: data.amount,
        description: data.description,
        isActive: true,
        validFrom: data.validFrom || new Date(),
        createdBy: data.createdBy
      }
    });
  }

  /**
   * Obtiene la configuración actual de mensualidad
   */
  async getCurrentMonthlyFee() {
    return await prisma.monthlyFeeConfig.findFirst({
      where: { isActive: true },
      orderBy: { validFrom: 'desc' }
    });
  }

  // ========== GESTIÓN DE PERÍODOS ==========

  /**
   * Crea un nuevo período de pago
   */
  async createPaymentPeriod(data: {
    year: number;
    month: number;
    dueDate: Date;
  }) {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const name = `${monthNames[data.month - 1]} ${data.year}`;

    return await prisma.paymentPeriod.create({
      data: {
        year: data.year,
        month: data.month,
        name,
        dueDate: data.dueDate,
        isActive: true
      }
    });
  }

  /**
   * Genera pagos mensuales para todos los estudiantes activos
   */
  async generateMonthlyPayments(periodId: number) {
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      throw new Error('Período no encontrado');
    }

    const currentFeeConfig = await this.getCurrentMonthlyFee();
    if (!currentFeeConfig) {
      throw new Error('No hay configuración de mensualidad activa');
    }

    // Obtener estudiantes activos
    const activeStudents = await prisma.student.findMany({
      where: { isActive: true }
    });

    const monthlyPayments = [];

    for (const student of activeStudents) {
      // Verificar si ya existe un pago para este estudiante y período
      const existingPayment = await prisma.monthlyPayment.findUnique({
        where: {
          studentId_periodId: {
            studentId: student.id,
            periodId: period.id
          }
        }
      });

      if (!existingPayment) {
        const monthlyPayment = await prisma.monthlyPayment.create({
          data: {
            studentId: student.id,
            periodId: period.id,
            feeConfigId: currentFeeConfig.id,
            expectedAmount: currentFeeConfig.amount,
            status: 'PENDING'
          }
        });

        monthlyPayments.push(monthlyPayment);
      }
    }

    return monthlyPayments;
  }

  // ========== FORMULARIOS DE PAGO ==========

  /**
   * Genera formularios de pago para un período específico
   */
  async generatePaymentForms(periodId: number) {
    const monthlyPayments = await prisma.monthlyPayment.findMany({
      where: { 
        periodId,
        status: 'PENDING'
      },
      include: {
        student: true,
        period: true
      }
    });

    const paymentForms = [];

    for (const payment of monthlyPayments) {
      // Verificar si ya existe un formulario activo
      const existingForm = await prisma.paymentForm.findFirst({
        where: {
          monthlyPaymentId: payment.id,
          status: { in: ['ACTIVE', 'USED'] }
        }
      });

      if (!existingForm) {
        const formId = generateId(); // Generar CUID único
        
        const paymentForm = await prisma.paymentForm.create({
          data: {
            id: formId,
            studentId: payment.studentId,
            periodId: payment.periodId,
            monthlyPaymentId: payment.id,
            studentName: payment.student.name,
            amount: payment.expectedAmount,
            status: 'ACTIVE',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
          }
        });

        paymentForms.push({
          ...paymentForm,
          url: `/payment/${formId}`
        });
      }
    }

    return paymentForms;
  }

  /**
   * Obtiene un formulario de pago por su ID
   */
  async getPaymentForm(formId: string) {
    const form = await prisma.paymentForm.findUnique({
      where: { id: formId },
      include: {
        student: true,
        period: true,
        monthlyPayment: true,
        paymentProofs: {
          orderBy: { uploadedAt: 'desc' }
        }
      }
    });

    if (!form) {
      throw new Error('Formulario no encontrado');
    }

    // Verificar si el formulario está expirado
    if (form.expiresAt && form.expiresAt < new Date()) {
      await prisma.paymentForm.update({
        where: { id: formId },
        data: { status: 'EXPIRED' }
      });
      
      throw new Error('Formulario expirado');
    }

    return form;
  }

  // ========== COMPROBANTES DE PAGO ==========

  /**
   * Sube un comprobante de pago
   */
  async uploadPaymentProof(formId: string, data: {
    payerName: string;
    payerPhone?: string;
    payerEmail?: string;
    amount: number;
    paymentMethod: 'CASH' | 'TRANSFER' | 'CARD';
    proofImageUrl: string;
  }) {
    const form = await this.getPaymentForm(formId);

    if (form.status !== 'ACTIVE') {
      throw new Error('Formulario no está disponible para recibir comprobantes');
    }

    // Crear comprobante
    const paymentProof = await prisma.paymentProof.create({
      data: {
        formId: form.id,
        payerName: data.payerName,
        payerPhone: data.payerPhone,
        payerEmail: data.payerEmail,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        proofImageUrl: data.proofImageUrl,
        status: 'PENDING'
      }
    });

    // Actualizar formulario como usado
    await prisma.paymentForm.update({
      where: { id: formId },
      data: { 
        status: 'USED',
        usedAt: new Date()
      }
    });

    // Actualizar pago mensual
    await prisma.monthlyPayment.update({
      where: { id: form.monthlyPaymentId },
      data: { status: 'PENDING_REVIEW' }
    });

    return paymentProof;
  }

  /**
   * Revisa y aprueba/rechaza un comprobante
   */
  async reviewPaymentProof(proofId: number, data: {
    status: 'APPROVED' | 'REJECTED' | 'NEEDS_REVIEW';
    reviewedBy: string;
    reviewNotes?: string;
    approvedAmount?: number;
  }) {
    const proof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: {
        paymentForm: {
          include: {
            monthlyPayment: true
          }
        }
      }
    });

    if (!proof) {
      throw new Error('Comprobante no encontrado');
    }

    // Actualizar comprobante
    const updatedProof = await prisma.paymentProof.update({
      where: { id: proofId },
      data: {
        status: data.status,
        reviewedAt: new Date(),
        reviewedBy: data.reviewedBy,
        reviewNotes: data.reviewNotes
      }
    });

    // Si se aprueba, actualizar el pago mensual
    if (data.status === 'APPROVED') {
      const paidAmount = data.approvedAmount || proof.amount;
      const monthlyPayment = proof.paymentForm.monthlyPayment;
      
      let paymentStatus: 'PAID' | 'PARTIAL_PAID' = 'PAID';
      
      if (paidAmount < monthlyPayment.expectedAmount) {
        paymentStatus = 'PARTIAL_PAID';
      }

      await prisma.monthlyPayment.update({
        where: { id: monthlyPayment.id },
        data: {
          status: paymentStatus,
          paidAmount: paidAmount,
          paymentDate: new Date(),
          approvedBy: data.reviewedBy
        }
      });

      // Actualizar estado de deuda del estudiante
      await this.updateStudentDebtStatus(monthlyPayment.studentId);
    }

    return updatedProof;
  }

  // ========== DASHBOARD Y REPORTES ==========

  /**
   * Obtiene el dashboard de pagos para un período
   */
  async getPaymentDashboard(periodId: number) {
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      throw new Error('Período no encontrado');
    }

    // Estadísticas generales
    const totalStudents = await prisma.student.count({
      where: { isActive: true }
    });

    const payments = await prisma.monthlyPayment.findMany({
      where: { periodId },
      include: {
        student: true,
        paymentForms: {
          include: {
            paymentProofs: true
          }
        }
      }
    });

    const totalExpected = payments.reduce((sum, p) => sum + p.expectedAmount, 0);
    const totalCollected = payments
      .filter(p => p.status === 'PAID' || p.status === 'PARTIAL_PAID')
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const pendingReview = await prisma.paymentProof.count({
      where: {
        status: 'PENDING',
        paymentForm: {
          periodId
        }
      }
    });

    const overdue = payments.filter(p => 
      p.status === 'PENDING' && new Date() > period.dueDate
    ).length;

    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    return {
      period,
      totalStudents,
      totalExpected,
      totalCollected,
      pendingReview,
      overdue,
      collectionRate: Math.round(collectionRate * 100) / 100,
      payments: payments.map(p => ({
        id: p.id,
        student: p.student,
        expectedAmount: p.expectedAmount,
        paidAmount: p.paidAmount,
        status: p.status,
        paymentDate: p.paymentDate,
        hasProofs: p.paymentForms.some(f => f.paymentProofs.length > 0),
        paymentFormId: p.paymentForms[0]?.id || null
      }))
    };
  }

  /**
   * Obtiene comprobantes pendientes de revisión
   */
  async getPendingProofs() {
    return await prisma.paymentProof.findMany({
      where: { status: 'PENDING' },
      include: {
        paymentForm: {
          include: {
            student: true,
            period: true,
            monthlyPayment: true
          }
        }
      },
      orderBy: { uploadedAt: 'asc' }
    });
  }

  /**
   * Obtiene formularios de pago por período para WhatsApp
   */
  async getPaymentFormsByPeriod(periodId: number) {
    return await prisma.paymentForm.findMany({
      where: { periodId },
      include: {
        student: true,
        period: true,
        monthlyPayment: true
      }
    });
  }

  // ========== UTILIDADES ==========

  /**
   * Actualiza el estado de deuda de un estudiante
   */
  private async updateStudentDebtStatus(studentId: number) {
    const unpaidPayments = await prisma.monthlyPayment.count({
      where: {
        studentId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIAL_PAID'] }
      }
    });

    await prisma.student.update({
      where: { id: studentId },
      data: { hasDebt: unpaidPayments > 0 }
    });
  }

  /**
   * Marca pagos vencidos como OVERDUE
   */
  async markOverduePayments() {
    const today = new Date();
    
    const overduePayments = await prisma.monthlyPayment.updateMany({
      where: {
        status: 'PENDING',
        period: {
          dueDate: {
            lt: today
          }
        }
      },
      data: { status: 'OVERDUE' }
    });

    return overduePayments;
  }
}

export const monthlyPaymentService = new MonthlyPaymentService(); 