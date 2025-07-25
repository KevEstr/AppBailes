import { prisma } from '@/lib/prisma';
import { generateId } from '@/lib/utils';
import { whatsappService } from '@/lib/whatsapp-service';
import { DigitalReceiptService } from '@/lib/digital-receipt-service';

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
            student: true,
            period: true,
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

    // Si se aprueba, procesar el pago
    if (data.status === 'APPROVED') {
      const paidAmount = data.approvedAmount || proof.amount;
      const monthlyPayment = proof.paymentForm.monthlyPayment;
      const student = proof.paymentForm.student;
      const period = proof.paymentForm.period;
      
      // Validar que el monto pagado no sea mayor al esperado
      if (paidAmount > monthlyPayment.expectedAmount) {
        throw new Error('El monto pagado no puede ser mayor al monto esperado');
      }

      // Calcular si es pago completo o parcial
      const remainingAmount = monthlyPayment.expectedAmount - paidAmount;
      const isPartialPayment = remainingAmount > 0;
      
      let paymentStatus: 'PAID' | 'PARTIAL_PAID' = isPartialPayment ? 'PARTIAL_PAID' : 'PAID';

      console.log(`💰 Procesando pago: $${paidAmount.toLocaleString()} de $${monthlyPayment.expectedAmount.toLocaleString()}`);
      if (isPartialPayment) {
        console.log(`📊 Pago parcial detectado. Faltante: $${remainingAmount.toLocaleString()}`);
      } else {
        console.log(`✅ Pago completo procesado`);
      }

      // Actualizar el pago mensual
      await prisma.monthlyPayment.update({
        where: { id: monthlyPayment.id },
        data: {
          status: paymentStatus,
          paidAmount: paidAmount,
          paymentDate: new Date(),
          approvedBy: data.reviewedBy,
          notes: isPartialPayment 
            ? `Pago parcial: $${paidAmount.toLocaleString()} de $${monthlyPayment.expectedAmount.toLocaleString()}. Pendiente: $${remainingAmount.toLocaleString()}`
            : `Pago completo: $${paidAmount.toLocaleString()}`
        }
      });

      // ========== CREAR DEUDA AUTOMÁTICA PARA PAGOS PARCIALES ==========
      
      if (isPartialPayment) {
        try {
          console.log('📋 Creando deuda automática por pago parcial...');
          
          // Verificar si ya existe una deuda para este período
          const existingDebt = await prisma.debt.findFirst({
            where: {
              studentId: student.id,
              concept: {
                contains: period.name
              },
              isPaid: false
            }
          });

          if (!existingDebt) {
            // Crear nueva deuda por el monto faltante
            const newDebt = await prisma.debt.create({
              data: {
                studentId: student.id,
                amount: remainingAmount,
                concept: `Saldo pendiente - ${period.name}`,
                dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días para pagar el resto
              }
            });

            console.log(`✅ Deuda automática creada: ID ${newDebt.id} por $${remainingAmount.toLocaleString()}`);
          } else {
            console.log(`⚠️ Ya existe una deuda para ${period.name}, no se crea nueva deuda`);
          }
        } catch (debtError) {
          console.error('❌ Error creando deuda automática:', debtError);
          // No fallar la operación principal si falla la creación de deuda
        }
      }

      // Actualizar estado de deuda del estudiante
      await this.updateStudentDebtStatus(monthlyPayment.studentId);

      // ========== GENERAR RECIBO DIGITAL ==========
      
      try {
        console.log('📄 Generando recibo digital...');
        const receiptData = await DigitalReceiptService.createReceiptFromMonthlyPayment(
          monthlyPayment.id,
          paidAmount,
          proof.paymentMethod,
          data.reviewedBy
        );
        
        console.log(`✅ Recibo digital generado: ${receiptData.receiptNumber}`);
        console.log(`🔗 URL del recibo: ${DigitalReceiptService.generateReceiptUrl(receiptData.id)}`);
        
      } catch (receiptError) {
        console.error('❌ Error generando recibo digital:', receiptError);
        // No fallar la operación principal si falla la generación del recibo
      }
    }

    // ========== ENVIAR NOTIFICACIONES DE WHATSAPP MEJORADAS ==========
    
    try {
      const student = proof.paymentForm.student;
      const period = proof.paymentForm.period;
      const monthlyPayment = proof.paymentForm.monthlyPayment;
      
      // Solo enviar si el estudiante tiene teléfono configurado
      if (student.phone) {
        const paymentMethodLabels = {
          'TRANSFER': 'Transferencia',
          'CASH': 'Efectivo',
          'CARD': 'Tarjeta'
        };

        if (data.status === 'APPROVED') {
          const paidAmount = data.approvedAmount || proof.amount;
          const remainingAmount = monthlyPayment.expectedAmount - paidAmount;
          const isPartialPayment = remainingAmount > 0;
          
          console.log('📤 Enviando notificación de comprobante APROBADO...');
          
          // Agregar URL del recibo digital si existe
          let receiptUrl = undefined;
          try {
            const existingReceipt = await prisma.receipt.findFirst({
              where: {
                studentId: student.id,
                concept: {
                  contains: period.name
                },
                createdAt: {
                  gte: new Date(Date.now() - 5 * 60 * 1000) // Últimos 5 minutos
                }
              },
              orderBy: { createdAt: 'desc' }
            });
            
            if (existingReceipt) {
              receiptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/recibo/${existingReceipt.id}`;
              console.log(`📄 Recibo encontrado para envío: ${receiptUrl}`);
            }
          } catch (receiptSearchError) {
            console.log('⚠️ No se pudo buscar recibo digital para el mensaje');
          }

          // Preparar datos de notificación mejorados
          const notificationData = {
            studentName: student.name,
            parentPhone: student.phone,
            period: period.name,
            amount: paidAmount,
            paymentMethod: paymentMethodLabels[proof.paymentMethod] || proof.paymentMethod,
            receiptUrl,
            // Información específica para pagos parciales
            isPartialPayment,
            expectedAmount: monthlyPayment.expectedAmount,
            remainingAmount: isPartialPayment ? remainingAmount : 0,
            paymentStatus: isPartialPayment ? 'PARTIAL' : 'COMPLETE'
          };
          
          await whatsappService.sendProofApprovedNotification(notificationData);
          console.log('✅ Notificación de aprobación enviada exitosamente');
          
        } else if (data.status === 'REJECTED') {
          console.log('📤 Enviando notificación de comprobante RECHAZADO...');
          
          // Obtener el link del formulario de pago si existe un formulario activo
          const activeForm = await prisma.paymentForm.findFirst({
            where: {
              studentId: student.id,
              periodId: period.id,
              status: 'ACTIVE'
            }
          });
          
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
          const paymentLink = activeForm ? `${baseUrl}/payment/${activeForm.id}` : undefined;
          
          const notificationData = {
            studentName: student.name,
            parentPhone: student.phone,
            period: period.name,
            amount: proof.amount,
            paymentMethod: paymentMethodLabels[proof.paymentMethod] || proof.paymentMethod,
            rejectionReason: data.reviewNotes || 'No se especificó motivo del rechazo',
            paymentLink,
            expectedAmount: monthlyPayment.expectedAmount
          };
          
          await whatsappService.sendProofRejectedNotification(notificationData);
          console.log('✅ Notificación de rechazo enviada exitosamente');
        }
      } else {
        console.log('⚠️ Estudiante sin teléfono configurado, notificación no enviada');
      }
    } catch (whatsappError) {
      console.error('❌ Error enviando notificación de WhatsApp:', whatsappError);
      // No fallar la operación principal si falla WhatsApp
    }

    return updatedProof;
  }

  // ========== DASHBOARD Y REPORTES ==========

  /**
   * Obtiene el dashboard de pagos para un período
   */
  async getPaymentDashboard(periodId: number, options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

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

    // Construir filtros de búsqueda
    const searchFilter = search ? {
      student: {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { id: { contains: search, mode: 'insensitive' as const } } // id es el documento
        ]
      }
    } : {};

    const whereClause = {
      periodId,
      ...searchFilter
    };

    // Obtener pagos con paginación
    const payments = await prisma.monthlyPayment.findMany({
      where: whereClause,
      include: {
        student: true,
        paymentForms: {
          include: {
            paymentProofs: true
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: { student: { name: 'asc' } }
    });

    // Contar total de pagos (con filtros aplicados)
    const totalPayments = await prisma.monthlyPayment.count({
      where: whereClause
    });

    // Estadísticas sin filtros de búsqueda para mantener consistencia
    const allPayments = await prisma.monthlyPayment.findMany({
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

    const totalExpected = allPayments.reduce((sum, p) => sum + p.expectedAmount, 0);
    const totalCollected = allPayments
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

    const overdue = allPayments.filter(p => 
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
      })),
      // Información de paginación
      pagination: {
        page,
        limit,
        total: totalPayments,
        totalPages: Math.ceil(totalPayments / limit),
        hasNext: page < Math.ceil(totalPayments / limit),
        hasPrev: page > 1
      }
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

    const unpaidDebts = await prisma.debt.count({
      where: {
        studentId,
        isPaid: false
      }
    });

    const hasDebt = (unpaidPayments + unpaidDebts) > 0;

    await prisma.student.update({
      where: { id: studentId },
      data: { hasDebt }
    });

    console.log(`📊 Estado de deuda actualizado para estudiante ${studentId}: ${hasDebt ? 'CON DEUDA' : 'SIN DEUDA'}`);
    console.log(`   - Pagos pendientes/parciales: ${unpaidPayments}`);
    console.log(`   - Deudas adicionales: ${unpaidDebts}`);
  }

  /**
   * Obtiene información detallada de deudas de un estudiante
   */
  async getStudentDebtInfo(studentId: number) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        monthlyPayments: {
          where: {
            status: { in: ['PENDING', 'OVERDUE', 'PARTIAL_PAID'] }
          },
          include: {
            period: true,
            feeConfig: true
          },
          orderBy: { createdAt: 'desc' }
        },
        debts: {
          where: { isPaid: false },
          orderBy: { dueDate: 'asc' }
        }
      }
    });

    if (!student) {
      throw new Error('Estudiante no encontrado');
    }

    // Calcular deudas de pagos parciales
    const partialPaymentDebts = student.monthlyPayments
      .filter(payment => payment.status === 'PARTIAL_PAID')
      .map(payment => ({
        id: payment.id,
        type: 'PARTIAL_PAYMENT',
        concept: `Saldo pendiente - ${payment.period.name}`,
        amount: payment.expectedAmount - (payment.paidAmount || 0),
        paidAmount: payment.paidAmount || 0,
        expectedAmount: payment.expectedAmount,
        dueDate: payment.period.dueDate,
        period: payment.period.name,
        isOverdue: new Date() > payment.period.dueDate
      }));

    // Deudas regulares
    const regularDebts = student.debts.map(debt => ({
      id: debt.id,
      type: 'REGULAR_DEBT',
      concept: debt.concept,
      amount: debt.amount,
      dueDate: debt.dueDate,
      isOverdue: new Date() > debt.dueDate,
      lastReminder: debt.lastReminder
    }));

    // Calcular totales
    const totalPartialDebt = partialPaymentDebts.reduce((sum, debt) => sum + debt.amount, 0);
    const totalRegularDebt = regularDebts.reduce((sum, debt) => sum + debt.amount, 0);
    const totalDebt = totalPartialDebt + totalRegularDebt;

    return {
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone,
        hasDebt: student.hasDebt
      },
      partialPaymentDebts,
      regularDebts,
      totals: {
        partialPaymentDebt: totalPartialDebt,
        regularDebt: totalRegularDebt,
        totalDebt,
        debtCount: partialPaymentDebts.length + regularDebts.length
      }
    };
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