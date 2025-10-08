import { prisma } from "@/lib/prisma";
import { whatsappService } from "@/lib/whatsapp-service";
import { DigitalReceiptService } from "@/lib/digital-receipt-service";

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
    sport: 'DANCE' | 'VOLLEYBALL';
  }) {
    // Desactivar configuraciones anteriores SOLO del mismo deporte
    await prisma.monthlyFeeConfig.updateMany({
      where: { isActive: true, sport: data.sport },
      data: {
        isActive: false,
        validUntil: new Date(),
      },
    });

    // Crear nueva configuración
    return await prisma.monthlyFeeConfig.create({
      data: {
        amount: data.amount,
        description: data.description,
        isActive: true,
        validFrom: data.validFrom || new Date(),
        createdBy: data.createdBy,
        sport: data.sport,
      },
    });
  }

  /**
   * Obtiene la configuración actual de mensualidad
   */
  async getCurrentMonthlyFee(sport: 'DANCE' | 'VOLLEYBALL') {
    // Obtener la última configuración activa por deporte (más reciente por id)
    return await prisma.monthlyFeeConfig.findFirst({
      where: { isActive: true, sport },
      orderBy: { id: 'desc' },
    });
  }

  async getLatestFeesBySport() {
    const [dance, volleyball] = await Promise.all([
      prisma.monthlyFeeConfig.findFirst({ where: { isActive: true, sport: 'DANCE' }, orderBy: { id: 'desc' } }),
      prisma.monthlyFeeConfig.findFirst({ where: { isActive: true, sport: 'VOLLEYBALL' }, orderBy: { id: 'desc' } }),
    ]);

    return { dance, volleyball };
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
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    const name = `${monthNames[data.month - 1]} ${data.year}`;

    return await prisma.paymentPeriod.create({
      data: {
        year: data.year,
        month: data.month,
        name,
        dueDate: data.dueDate,
        isActive: true,
      },
    });
  }

  /**
   * Genera pagos mensuales para todos los estudiantes activos
   * Actualiza pagos existentes si cambió el valor de la mensualidad
   */
  async generateMonthlyPayments(periodId: number, regenerate: boolean = false) {
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Las tarifas ahora son por deporte; se resuelve por estudiante

    // Obtener estudiantes activos con sus datos de inscripción y clases
    const activeStudents = await prisma.student.findMany({
      where: { isActive: true },
      include: {
        enrollmentData: true,
        classEnrollments: {
          where: { isActive: true },
          include: {
            danceClass: {
              select: { sport: true }
            }
          }
        }
      }
    });

    const monthlyPayments = [] as any[];
    const updatedPayments = [] as any[];

    for (const student of activeStudents) {
      // Verificar si ya existe un pago para este estudiante y período
      const existingPayment = await prisma.monthlyPayment.findFirst({
        where: {
          studentId: student.id,
          periodId: period.id,
        },
      });

      const { amount, feeConfigId } = await this.resolveStudentFeeAndConfig(student);

      if (!existingPayment) {
        // Crear nuevo pago si no existe
        const monthlyPayment = await prisma.monthlyPayment.create({
          data: {
            studentId: student.id,
            periodId: period.id,
            feeConfigId: feeConfigId,
            expectedAmount: amount,
            status: "PENDING",
          },
        });

        monthlyPayments.push(monthlyPayment);
      } else if (regenerate || existingPayment.expectedAmount !== amount || existingPayment.feeConfigId !== feeConfigId) {
        // Actualizar pago existente si:
        // 1. Se solicita regeneración explícita (regenerate = true)
        // 2. El monto esperado cambió
        // 3. La configuración de tarifa cambió
        const updatedPayment = await prisma.monthlyPayment.update({
          where: { id: existingPayment.id },
          data: {
            expectedAmount: amount,
            feeConfigId: feeConfigId,
            // Solo cambiar estado a PENDING si el pago no ha sido pagado
            status: existingPayment.status === "PAID" || existingPayment.status === "PARTIAL_PAID" 
              ? existingPayment.status 
              : "PENDING",
          },
        });

        updatedPayments.push(updatedPayment);
      }
    }

    return {
      created: monthlyPayments,
      updated: updatedPayments,
      total: monthlyPayments.length + updatedPayments.length
    };
  }

  /**
   * Determina la mensualidad correcta para un estudiante específico
   * Prioridad: 1) Mensualidad individual, 2) Por deporte, 3) Configuración global
   * FUNCIÓN PÚBLICA para usar en otras partes del sistema
   */
  async getStudentMonthlyFee(student: any, defaultAmount?: number): Promise<number> {
    // 1. Si el estudiante tiene mensualidad individual configurada, usarla
    if (student.enrollmentData?.monthlyFee && student.enrollmentData.monthlyFee > 0) {
      console.log(`💰 Estudiante ${student.name}: Usando mensualidad individual $${student.enrollmentData.monthlyFee.toLocaleString()}`);
      return student.enrollmentData.monthlyFee;
    }

    // 2. Determinar mensualidad por deporte usando la tabla monthly_fee_configs
    if (student.classEnrollments && student.classEnrollments.length > 0) {
      // Obtener deportes únicos de las inscripciones activas
      const sports = [...new Set(student.classEnrollments.map((enrollment: any) => enrollment.danceClass.sport))];
      
      if (sports.length > 0) {
        // Si tiene múltiples deportes, priorizar DANCE sobre VOLLEYBALL
        const primarySport = sports.includes('DANCE') ? 'DANCE' : sports[0];
        const feeConfig = await prisma.monthlyFeeConfig.findFirst({
          where: { isActive: true, sport: primarySport as any },
          orderBy: { id: 'desc' },
        });

        if (feeConfig) {
          console.log(`🏷️ Estudiante ${student.name}: Deporte ${primarySport} - Mensualidad $${feeConfig.amount.toLocaleString()} (config ${feeConfig.id})`);
          return feeConfig.amount;
        }

        console.log(`⚠️ Estudiante ${student.name}: No hay configuración activa para ${primarySport}${defaultAmount ? ', usando fallback' : ''}`);
        if (defaultAmount) return defaultAmount;
        throw new Error('No hay configuración de mensualidad activa para el deporte');
      }
    }

    // 3. Como respaldo, usar configuración global
    if (typeof defaultAmount === 'number') {
      console.log(`📋 Estudiante ${student.name}: Sin inscripciones activas, usando configuración global $${defaultAmount.toLocaleString()}`);
      return defaultAmount;
    }

    // Si no se pasó defaultAmount, intentar buscar cualquier configuración activa más reciente (priorizar DANCE)
    const anyConfig = await prisma.monthlyFeeConfig.findFirst({ orderBy: { id: 'desc' } });
    if (anyConfig) return anyConfig.amount;
    throw new Error('No hay configuración de mensualidad disponible');
  }

  /**
   * Resuelve el monto y feeConfigId por estudiante considerando override individual y deporte
   */
  private async resolveStudentFeeAndConfig(student: any): Promise<{ amount: number; feeConfigId: number }> {
    // override individual
    if (student.enrollmentData?.monthlyFee && student.enrollmentData.monthlyFee > 0) {
      // Buscar la config más reciente del deporte del estudiante (si existe) para referenciar feeConfigId coherente
      const primarySport = this.pickPrimarySport(student);
      const feeConfig = primarySport
        ? await prisma.monthlyFeeConfig.findFirst({ where: { isActive: true, sport: primarySport as any }, orderBy: { id: 'desc' } })
        : await prisma.monthlyFeeConfig.findFirst({ orderBy: { id: 'desc' } });

      if (!feeConfig) throw new Error('No hay configuración de mensualidad activa');
      return { amount: student.enrollmentData.monthlyFee, feeConfigId: feeConfig.id };
    }

    const primarySport = this.pickPrimarySport(student);
    if (!primarySport) {
      // Sin deporte: tomar la última configuración disponible (cualquier deporte)
      const fallback = await prisma.monthlyFeeConfig.findFirst({ orderBy: { id: 'desc' } });
      if (!fallback) throw new Error('No hay configuración de mensualidad activa');
      return { amount: fallback.amount, feeConfigId: fallback.id };
    }

    const feeConfig = await prisma.monthlyFeeConfig.findFirst({ where: { isActive: true, sport: primarySport as any }, orderBy: { id: 'desc' } });
    if (!feeConfig) throw new Error(`No hay configuración activa para ${primarySport}`);
    return { amount: feeConfig.amount, feeConfigId: feeConfig.id };
  }

  private pickPrimarySport(student: any): 'DANCE' | 'VOLLEYBALL' | null {
    if (!student.classEnrollments || student.classEnrollments.length === 0) return null;
    const sports = [...new Set(student.classEnrollments.map((enrollment: any) => enrollment.danceClass.sport))];
    if (sports.length === 0) return null;
    return (sports.includes('DANCE') ? 'DANCE' : sports[0]) as any;
  }

  // ========== GESTIÓN DE PAGOS PENDIENTES ==========

  /**
   * Marca un pago mensual como recibido (nuevo sistema sin formularios)
   */
  async markPaymentAsReceived(
    paymentId: number,
    data: {
      paymentMethod: "CASH" | "TRANSFER" | "CARD";
      receivedAmount?: number;
      additionalDebt?: number;
      discount?: number;
      markedBy: string;
      notes?: string;
    }
  ) {
    const payment = await prisma.monthlyPayment.findUnique({
      where: { id: paymentId },
      include: { student: true, period: true, feeConfig: true },
    });

    if (!payment) {
      throw new Error("Pago no encontrado");
    }

    if (payment.status === "PAID") {
      throw new Error("El pago ya ha sido marcado como recibido");
    }

    // Calcular el monto efectivo considerando descuentos
    const baseAmount = payment.expectedAmount;
    const discountAmount = data.discount || 0;
    const effectiveExpectedAmount = Math.max(0, baseAmount - discountAmount);
    
    // CRÍTICO: Si hay descuento, actualizar el expectedAmount en la DB ANTES de las comparaciones
    // Esto asegura que el resto de la lógica funcione correctamente
    if (discountAmount > 0) {
      await prisma.monthlyPayment.update({
        where: { id: paymentId },
        data: { expectedAmount: effectiveExpectedAmount }
      });
      payment.expectedAmount = effectiveExpectedAmount;
      console.log("payment: ", payment);
      console.log(`💰 Descuento aplicado: $${discountAmount.toLocaleString()}. Nuevo monto esperado: $${effectiveExpectedAmount.toLocaleString()}`);
    }
    
    const receivedAmount = data.receivedAmount || effectiveExpectedAmount;
    const isPartialPayment = receivedAmount < effectiveExpectedAmount;
    const newStatus: "PAID" | "PARTIAL_PAID" = isPartialPayment ? "PARTIAL_PAID" : "PAID";

    // Actualizar el pago
    const updatedPayment = await prisma.monthlyPayment.update({
      where: { id: paymentId },
      data: {
        status: newStatus,
        paidAmount: receivedAmount,
        paymentDate: new Date(),
        approvedBy: data.markedBy,
        notes: this.generatePaymentNotes(data, receivedAmount, effectiveExpectedAmount, baseAmount, isPartialPayment),
          },
        });

    // Actualizar estado de deuda del estudiante
    console.log("🔄 Actualizando estado de deuda del estudiante...");
    await this.updateStudentDebtStatus(payment.studentId);
    console.log("✅ Estado de deuda actualizado");

    // Crear nuevo pago pendiente para el saldo restante si es pago parcial
    if (isPartialPayment) {
      console.log("🔄 Creando pago pendiente para saldo restante...");
      await this.createRemainingPayment(payment.student, payment.period, effectiveExpectedAmount - receivedAmount, data.markedBy);
      console.log("✅ Pago pendiente creado");
    }

    // Crear deuda adicional SOLO si es pago parcial y se especificó manualmente
    if (isPartialPayment && data.additionalDebt && data.additionalDebt > 0) {
      console.log("🔄 Creando deuda adicional...");
      await this.createAdditionalDebt(payment.student, payment.period, data.additionalDebt, data.notes);
      console.log("✅ Deuda adicional creada");
    }

    // Generar recibo digital (con manejo de errores)
    let receiptData = null;
    try {
      receiptData = await this.generateDigitalReceipt(paymentId, receivedAmount, data.paymentMethod, data.markedBy);
    } catch (receiptError) {
      console.error("❌ Error generando recibo digital (continuando):", receiptError);
      // No lanzar error, continuar sin recibo
    }

    // Enviar notificación de WhatsApp con el recibo (con manejo de errores)
    try {
      await this.sendPaymentReceivedNotification(payment, receivedAmount, data.paymentMethod, receiptData);
    } catch (whatsappError) {
      console.error("❌ Error enviando notificación WhatsApp (continuando):", whatsappError);
      // No lanzar error, continuar sin notificación
    }

    console.log(`✅ Pago marcado como recibido: ${payment.student.name} - $${receivedAmount.toLocaleString()}`);

    return updatedPayment;
  }

  /**
   * Obtiene estadísticas de pagos pendientes para un período
   */
  async getPendingPaymentsStats(periodId: number) {
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Obtener estadísticas generales
    const totalStudents = await prisma.student.count({
      where: { isActive: true },
    });

    // Obtener estadísticas de pagos para este período
    const payments = await prisma.monthlyPayment.findMany({
      where: { periodId },
      include: {
        student: true,
      },
    });

    const totalExpected = payments.reduce((sum, p) => sum + p.expectedAmount, 0);
    const totalCollected = payments
      .filter((p) => p.status === "PAID" || p.status === "PARTIAL_PAID")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const pendingCount = payments.filter((p) => p.status === "PENDING").length;
    const overdueCount = payments.filter((p) => p.status === "OVERDUE").length;
    const paidCount = payments.filter((p) => p.status === "PAID").length;
    const partialPaidCount = payments.filter((p) => p.status === "PARTIAL_PAID").length;

    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    return {
      period: {
        id: period.id,
        name: period.name,
        dueDate: period.dueDate,
      },
      totalStudents,
      totalExpected,
      totalCollected,
      pendingCount,
      overdueCount,
      paidCount,
      partialPaidCount,
      collectionRate: Math.round(collectionRate * 100) / 100,
    };
  }

  /**
   * Obtiene todos los pagos para un período específico con filtro opcional por estado
   */
  async getAllPayments(periodId: number, options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  } = {}) {
    const { page = 1, limit = 10, search, status } = options;
    const offset = (page - 1) * limit;

    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Construir filtros de búsqueda
    const searchFilter = search ? {
      student: {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { id: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } }
        ]
      }
    } : {};

    // Construir filtro de estado
    const statusFilter = status && status !== 'ALL' ? {
      status: status as "PENDING" | "PAID" | "OVERDUE" | "PARTIAL_PAID"
    } : {};

    const whereClause = {
      periodId,
      ...searchFilter,
      ...statusFilter
    };

    // Obtener pagos con paginación
    const [payments, total] = await Promise.all([
      prisma.monthlyPayment.findMany({
        where: whereClause,
        include: {
          student: true,
          period: true,
          feeConfig: true,
        },
        skip: offset,
        take: limit,
        orderBy: { student: { name: 'asc' } }
      }),
      prisma.monthlyPayment.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      payments: payments.map(payment => ({
        id: payment.id,
        student: {
          id: payment.student.id,
          name: payment.student.name,
          phone: payment.student.phone
        },
        expectedAmount: payment.expectedAmount,
        paidAmount: payment.paidAmount,
        status: payment.status,
        period: payment.period.name,
        dueDate: payment.period.dueDate,
        isOverdue: new Date() > payment.period.dueDate && (payment.status === 'PENDING' || payment.status === 'OVERDUE'),
        createdAt: payment.createdAt,
        paymentDate: payment.paymentDate,
      })),
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Obtiene pagos pendientes para un período específico
   */
  async getPendingPayments(periodId: number, options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Construir filtros de búsqueda
    const searchFilter = search ? {
      student: {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { id: { contains: search, mode: 'insensitive' as const } },
          { phone: { contains: search, mode: 'insensitive' as const } }
        ]
      }
    } : {};

    const whereClause = {
      periodId,
      status: { in: ["PENDING", "OVERDUE"] as ("PENDING" | "OVERDUE")[] },
      ...searchFilter
    };

    // Obtener pagos con paginación
    const [payments, total] = await Promise.all([
      prisma.monthlyPayment.findMany({
        where: whereClause,
        include: {
          student: true,
          period: true,
          feeConfig: true,
        },
        skip: offset,
        take: limit,
        orderBy: { student: { name: 'asc' } }
      }),
      prisma.monthlyPayment.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      payments: payments.map(payment => ({
        id: payment.id,
        student: {
          id: payment.student.id,
          name: payment.student.name,
          phone: payment.student.phone
        },
        expectedAmount: payment.expectedAmount,
        status: payment.status,
        period: payment.period.name,
        dueDate: payment.period.dueDate,
        isOverdue: new Date() > payment.period.dueDate && (payment.status === 'PENDING' || payment.status === 'OVERDUE'),
        createdAt: payment.createdAt,
      })),
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Recalcula montos y feeConfigId para pagos PENDING de un período, usando la configuración más reciente por deporte
   */
  async recalculatePendingPaymentsForPeriod(periodId: number) {
    const payments = await prisma.monthlyPayment.findMany({
      where: { periodId, status: "PENDING" },
      include: {
        student: {
          include: {
            enrollmentData: true,
            classEnrollments: {
              where: { isActive: true },
              include: { danceClass: { select: { sport: true } } },
            },
          },
        },
      },
    });

    for (const payment of payments) {
      const { amount, feeConfigId } = await this.resolveStudentFeeAndConfig(payment.student);
      // Actualizar solo si cambió algo
      if (payment.expectedAmount !== amount || payment.feeConfigId !== feeConfigId) {
        await prisma.monthlyPayment.update({
          where: { id: payment.id },
          data: { expectedAmount: amount, feeConfigId },
        });
      }
    }
  }

  /**
   * Obtiene un formulario de pago por su ID
   */
  async getPaymentForm(formId: string) {
    const form = await prisma.paymentForm.findUnique({
      where: { id: formId },
      include: {
        student: {
          include: {
            classEnrollments: {
              where: { isActive: true },
              include: {
                danceClass: {
                  select: { sport: true }
                }
              }
            }
          }
        },
        period: true,
        monthlyPayment: true,
        paymentProofs: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!form) {
      throw new Error("Formulario no encontrado");
    }

    // Verificar si el formulario está expirado
    if (form.expiresAt && form.expiresAt < new Date()) {
      await prisma.paymentForm.update({
        where: { id: formId },
        data: { status: "EXPIRED" },
      });

      throw new Error("Formulario expirado");
    }

    // Aplicar descuento por pronto pago (antes del 15 del mes del período)
    // Sin modificar la base de datos; solo el valor que se expone en el formulario
    let effectiveAmount = form.amount;
    try {
      const now = new Date();
      const periodDate = new Date(form.period.year, form.period.month - 1, 1);
      const samePeriod =
        now.getFullYear() === periodDate.getFullYear() &&
        now.getMonth() === periodDate.getMonth();
      const isEarly = now.getDate() <= 15;

      if (samePeriod && isEarly) {
        const DISCOUNT_VALUE = 5000; // $5.000 descuento antes del 15
        effectiveAmount = Math.max(0, (form.amount as number) - DISCOUNT_VALUE);
      }
    } catch (e) {
      // Si hay algún problema con fechas, retornamos el monto original sin bloquear el flujo
      effectiveAmount = form.amount as number;
    }

    // Devolver copia inmutable con el monto efectivo aplicado
    return {
      ...form,
      amount: effectiveAmount,
    } as typeof form;
  }

  // ========== COMPROBANTES DE PAGO ==========

  /**
   * Sube un comprobante de pago
   */
  async uploadPaymentProof(
    formId: string,
    data: {
      payerName: string;
      payerPhone?: string;
      payerEmail?: string;
      paymentMethod: "CASH" | "TRANSFER" | "CARD";
      proofImageUrl: string;
    }
  ) {
    const form = await this.getPaymentForm(formId);

    if (form.status !== "ACTIVE") {
      throw new Error(
        "Formulario no está disponible para recibir comprobantes"
      );
    }

    // Calcular monto efectivo usando la misma regla del formulario (descuento antes del 15)
    let effectiveAmount = form.amount as number;
    try {
      const now = new Date();
      const periodDate = new Date(form.period.year, form.period.month - 1, 1);
      const samePeriod =
        now.getFullYear() === periodDate.getFullYear() &&
        now.getMonth() === periodDate.getMonth();
      const isEarly = now.getDate() <= 15;
      if (samePeriod && isEarly) {
        const DISCOUNT_VALUE = 5000;
        effectiveAmount = Math.max(0, (form.monthlyPayment.expectedAmount as number) - DISCOUNT_VALUE);
      } else {
        effectiveAmount = form.monthlyPayment.expectedAmount as number;
      }
    } catch {
      effectiveAmount = (form.monthlyPayment.expectedAmount as number) || (form.amount as number);
    }

    // Crear comprobante con el monto efectivo calculado
    const paymentProof = await prisma.paymentProof.create({
      data: {
        formId: form.id,
        payerName: data.payerName,
        payerPhone: data.payerPhone,
        payerEmail: data.payerEmail,
        amount: effectiveAmount,
        paymentMethod: data.paymentMethod,
        proofImageUrl: data.proofImageUrl,
        status: "PENDING",
      },
    });

    // Actualizar formulario como usado
    await prisma.paymentForm.update({
      where: { id: formId },
      data: {
        status: "USED",
        usedAt: new Date(),
        amount: effectiveAmount,
      },
    });

    // Actualizar pago mensual
    await prisma.monthlyPayment.update({
      where: { id: form.monthlyPaymentId },
      data: { status: "PENDING_REVIEW" },
    });

    return paymentProof;
  }

  /**
   * Revisa y aprueba/rechaza un comprobante
   */
  async reviewPaymentProof(
    proofId: number,
    data: {
      status: "APPROVED" | "REJECTED" | "NEEDS_REVIEW";
      reviewedBy: string;
      reviewNotes?: string;
      approvedAmount?: number;
    }
  ) {
    const proof = await this.getPaymentProofForReview(proofId);
    
    // Actualizar comprobante
    const updatedProof = await prisma.paymentProof.update({
      where: { id: proofId },
      data: {
        status: data.status,
        reviewedAt: new Date(),
        reviewedBy: data.reviewedBy,
        reviewNotes: data.reviewNotes,
      },
    });

    // Procesar según el estado
    if (data.status === "APPROVED") {
      await this.processApprovedPayment(proof, data);
    }

    // Enviar notificaciones
    await this.sendPaymentNotification(proof, data);

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
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Estadísticas generales
    const totalStudents = await prisma.student.count({
      where: { isActive: true },
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

    const totalExpected = payments.reduce(
      (sum, p) => sum + p.expectedAmount,
      0
    );
    const totalCollected = payments
      .filter((p) => p.status === "PAID" || p.status === "PARTIAL_PAID")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);

    const pendingReview = await prisma.paymentProof.count({
      where: {
        status: "PENDING",
        paymentForm: {
          periodId,
        },
      },
    });

    const overdue = payments.filter(
      (p) => p.status === "PENDING" && new Date() > period.dueDate
    ).length;

    const collectionRate =
      totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    // Calcular total de pagos para paginación
    const totalPayments = await prisma.monthlyPayment.count({
      where: whereClause
    });

    const totalPages = Math.ceil(totalPayments / limit);

    return {
      period,
      totalStudents,
      totalExpected,
      totalCollected,
      pendingReview,
      overdue,
      collectionRate: Math.round(collectionRate * 100) / 100,
      payments: payments.map((p) => ({
        id: p.id,
        student: p.student,
        expectedAmount: p.expectedAmount,
        paidAmount: p.paidAmount,
        status: p.status,
        paymentDate: p.paymentDate,
        hasProofs: p.paymentForms.some((f) => f.paymentProofs.length > 0),
        paymentFormId: p.paymentForms[0]?.id || null,
      })),
      pagination: {
        page,
        limit,
        total: totalPayments,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Obtiene comprobantes pendientes de revisión
   */
  async getPendingProofs() {
    // Obtener comprobantes de pagos mensuales
    const monthlyProofs = await prisma.paymentProof.findMany({
      where: { status: "PENDING" },
      include: {
        paymentForm: {
          include: {
            student: true,
            period: true,
            monthlyPayment: true,
          },
        },
      },
      orderBy: { uploadedAt: "asc" },
    });

    // Obtener comprobantes de pagos de inscripción
    const enrollmentProofs = await prisma.enrollmentPaymentProof.findMany({
      where: { status: "PENDING" },
      include: {
        paymentForm: {
          include: {
            student: true,
            period: true,
            monthlyPayment: true,
          },
        },
        enrollmentPaymentForm: {
          include: {
            student: true,
            enrollmentPayment: true,
          },
        },
      },
      orderBy: { uploadedAt: "asc" },
    });

    // Combinar y formatear los resultados
    const formattedMonthlyProofs = monthlyProofs.map(proof => ({
      ...proof,
      proofType: 'MONTHLY',
      student: proof.paymentForm?.student,
      period: proof.paymentForm?.period,
      monthlyPayment: proof.paymentForm?.monthlyPayment,
    }));

    const formattedEnrollmentProofs = enrollmentProofs.map(proof => ({
      ...proof,
      proofType: 'ENROLLMENT',
      student: proof.enrollmentPaymentForm?.student || proof.paymentForm?.student,
      period: proof.paymentForm?.period,
      monthlyPayment: proof.paymentForm?.monthlyPayment,
      enrollmentPayment: proof.enrollmentPaymentForm?.enrollmentPayment,
    }));

    // Combinar ambos arrays y ordenar por fecha de subida
    const allProofs = [...formattedMonthlyProofs, ...formattedEnrollmentProofs];
    return allProofs.sort((a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime());
  }

  /**
   * Obtiene formularios de pago por período para WhatsApp
   */
  async getPaymentFormsByPeriod(periodId: number) {
    return await prisma.paymentForm.findMany({
      where: { periodId },
      include: {
        student: {
          include: {
            classEnrollments: {
              where: { isActive: true },
              include: {
                danceClass: {
                  select: { sport: true }
                }
              }
            }
          }
        },
        period: true,
        monthlyPayment: true,
      },
    });
  }

  // ========== UTILIDADES ==========

  /**
   * Actualiza el estado de deuda de un estudiante
   */
  private async updateStudentDebtStatus(studentId: string) {
    const unpaidPayments = await prisma.monthlyPayment.count({
      where: {
        studentId,
        status: { in: ["PENDING", "OVERDUE", "PARTIAL_PAID"] },
      },
    });

    const unpaidDebts = await prisma.debt.count({
      where: {
        studentId,
        isPaid: false,
      },
    });

    const hasDebt = unpaidPayments + unpaidDebts > 0;

    await prisma.student.update({
      where: { id: studentId },
      data: { hasDebt },
    });

    console.log(
      `📊 Estado de deuda actualizado para estudiante ${studentId}: ${
        hasDebt ? "CON DEUDA" : "SIN DEUDA"
      }`
    );
    console.log(`   - Pagos pendientes/parciales: ${unpaidPayments}`);
    console.log(`   - Deudas adicionales: ${unpaidDebts}`);
  }

  /**
   * Obtiene información detallada de deudas de un estudiante
   */
  async getStudentDebtInfo(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        monthlyPayments: {
          where: {
            status: { in: ["PENDING", "OVERDUE", "PARTIAL_PAID"] },
          },
          include: {
            period: true,
            feeConfig: true,
          },
          orderBy: { createdAt: "desc" },
        },
        debts: {
          where: { isPaid: false },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!student) {
      throw new Error("Estudiante no encontrado");
    }

    // Calcular deudas de pagos parciales
    const partialPaymentDebts = student.monthlyPayments
      .filter((payment) => payment.status === "PARTIAL_PAID")
      .map((payment) => ({
        id: payment.id,
        type: "PARTIAL_PAYMENT",
        concept: `Saldo pendiente - ${payment.period.name}`,
        amount: payment.expectedAmount - (payment.paidAmount || 0),
        paidAmount: payment.paidAmount || 0,
        expectedAmount: payment.expectedAmount,
        dueDate: payment.period.dueDate,
        period: payment.period.name,
        isOverdue: new Date() > payment.period.dueDate && (payment.status === 'PENDING' || payment.status === 'OVERDUE'),
      }));

    // Deudas regulares
    const regularDebts = student.debts.map((debt) => ({
      id: debt.id,
      type: "REGULAR_DEBT",
      concept: debt.concept,
      amount: debt.amount,
      dueDate: debt.dueDate,
      isOverdue: new Date() > debt.dueDate,
      lastReminder: debt.lastReminder,
    }));

    // Calcular totales
    const totalPartialDebt = partialPaymentDebts.reduce(
      (sum, debt) => sum + debt.amount,
      0
    );
    const totalRegularDebt = regularDebts.reduce(
      (sum, debt) => sum + debt.amount,
      0
    );
    const totalDebt = totalPartialDebt + totalRegularDebt;

    return {
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone,
        hasDebt: student.hasDebt,
      },
      partialPaymentDebts,
      regularDebts,
      totals: {
        partialPaymentDebt: totalPartialDebt,
        regularDebt: totalRegularDebt,
        totalDebt,
        debtCount: partialPaymentDebts.length + regularDebts.length,
      },
    };
  }

  /**
   * Marca pagos vencidos como OVERDUE
   */
  async markOverduePayments() {
    const today = new Date();

    const overduePayments = await prisma.monthlyPayment.updateMany({
      where: {
        status: "PENDING",
        period: {
          dueDate: {
            lt: today,
          },
        },
      },
      data: { status: "OVERDUE" },
    });

    return overduePayments;
  }

  // ========== MÉTODOS AUXILIARES PARA REVISIÓN DE COMPROBANTES ==========

  /**
   * Obtiene el comprobante de pago con todas las relaciones necesarias
   */
  private async getPaymentProofForReview(proofId: number) {
    const proof = await prisma.paymentProof.findUnique({
      where: { id: proofId },
      include: {
        paymentForm: {
          include: {
            student: true,
            period: true,
            monthlyPayment: true,
          },
        },
      },
    });

    if (!proof) {
      throw new Error("Comprobante no encontrado");
    }

    return proof;
  }

  /**
   * Procesa un pago aprobado
   */
  private async processApprovedPayment(proof: any, data: any) {
    const paidAmount = data.approvedAmount || proof.amount;
    const monthlyPayment = proof.paymentForm.monthlyPayment;
    const student = proof.paymentForm.student;
    const period = proof.paymentForm.period;
    // Usar el monto esperado efectivo (con descuento si aplica) desde el formulario
    const expectedAmountEffective = proof.paymentForm.amount ?? monthlyPayment.expectedAmount;

    // CRÍTICO: Si el formulario tiene un monto diferente al esperado (descuento aplicado),
    // actualizar el expectedAmount en la DB ANTES de las comparaciones
    if (expectedAmountEffective !== monthlyPayment.expectedAmount) {
      await prisma.monthlyPayment.update({
        where: { id: monthlyPayment.id },
        data: { expectedAmount: expectedAmountEffective }
      });
      console.log(`💰 Descuento aplicado desde formulario: Nuevo monto esperado: $${expectedAmountEffective.toLocaleString()}`);
    }

    // Validar monto contra el esperado efectivo
    if (paidAmount > expectedAmountEffective) {
      throw new Error("El monto pagado no puede ser mayor al monto esperado");
    }

    // Calcular estado del pago usando el esperado efectivo
    const remainingAmount = expectedAmountEffective - paidAmount;
    const isPartialPayment = remainingAmount > 0;
    const paymentStatus: "PAID" | "PARTIAL_PAID" = isPartialPayment ? "PARTIAL_PAID" : "PAID";

    console.log(`💰 Procesando pago: $${paidAmount.toLocaleString()} de $${expectedAmountEffective.toLocaleString()}`);

    // Actualizar el pago mensual
    await this.updateMonthlyPaymentStatus(monthlyPayment.id, paidAmount, paymentStatus, remainingAmount, data.reviewedBy);

    // Nota: No se crean deudas automáticas por pagos parciales
    // Las deudas solo se crean manualmente desde el modal de marcar pago como recibido

    // Actualizar estado de deuda del estudiante
    await this.updateStudentDebtStatus(monthlyPayment.studentId);

    // Generar recibo digital
    await this.generateDigitalReceipt(monthlyPayment.id, paidAmount, proof.paymentMethod, data.reviewedBy);
  }

  /**
   * Actualiza el pago mensual con la información procesada
   */
  private async updateMonthlyPaymentStatus(
    monthlyPaymentId: number,
    paidAmount: number,
    paymentStatus: "PAID" | "PARTIAL_PAID",
    remainingAmount: number,
    reviewedBy: string
  ) {
    const isPartialPayment = paymentStatus === "PARTIAL_PAID";
    
    await prisma.monthlyPayment.update({
      where: { id: monthlyPaymentId },
      data: {
        status: paymentStatus,
        paidAmount: paidAmount,
        paymentDate: new Date(),
        approvedBy: reviewedBy,
        notes: isPartialPayment
          ? `Pago parcial: $${paidAmount.toLocaleString()} de $${(paidAmount + remainingAmount).toLocaleString()}. Pendiente: $${remainingAmount.toLocaleString()}`
          : `Pago completo: $${paidAmount.toLocaleString()}`,
      },
    });
  }

  /**
   * Genera las notas del pago considerando descuentos y adeudos
   */
  private generatePaymentNotes(
    data: any,
    receivedAmount: number,
    effectiveExpectedAmount: number,
    baseAmount: number,
    isPartialPayment: boolean
  ): string {
    let notes = [];
    
    if (data.notes) {
      notes.push(data.notes);
    }
    
    if (data.discount && data.discount > 0) {
      notes.push(`Descuento aplicado: $${data.discount.toLocaleString()}`);
    }
    
    if (isPartialPayment) {
      notes.push(`Pago parcial: $${receivedAmount.toLocaleString()} de $${effectiveExpectedAmount.toLocaleString()}. Saldo restante: $${(effectiveExpectedAmount - receivedAmount).toLocaleString()}`);
    } else {
      notes.push(`Pago completo: $${receivedAmount.toLocaleString()}`);
    }
    
    if (data.additionalDebt && data.additionalDebt > 0) {
      notes.push(`Adeudo adicional registrado: $${data.additionalDebt.toLocaleString()}`);
    }
    
    return notes.join('. ');
  }

  /**
   * Crea un nuevo pago pendiente para el saldo restante de un pago parcial
   */
  private async createRemainingPayment(student: any, period: any, remainingAmount: number, createdBy: string) {
    try {
      console.log("📋 Creando nuevo pago pendiente para saldo restante...");

      // Obtener la configuración de tarifa más reciente
      const feeConfig = await prisma.monthlyFeeConfig.findFirst({
        where: { isActive: true },
        orderBy: { id: 'desc' },
      });

      if (!feeConfig) {
        throw new Error('No hay configuración de mensualidad activa');
      }

      const newPayment = await prisma.monthlyPayment.create({
        data: {
          studentId: student.id,
          periodId: period.id,
          feeConfigId: feeConfig.id,
          expectedAmount: remainingAmount,
          status: "PENDING",
          notes: `Saldo restante de pago parcial - ${period.name}`,
        },
      });

      console.log(`✅ Nuevo pago pendiente creado: ID ${newPayment.id} por $${remainingAmount.toLocaleString()}`);
    } catch (error) {
      console.error("❌ Error creando nuevo pago pendiente:", error);
      throw new Error("Error al crear nuevo pago pendiente");
    }
  }

  /**
   * Crea una deuda adicional manual
   */
  private async createAdditionalDebt(student: any, period: any, amount: number, notes?: string) {
    try {
      console.log("📋 Creando deuda adicional manual...");

      const debtConcept = `Adeudo adicional - ${period.name}${notes ? ` (${notes})` : ''}`;
      
      const newDebt = await prisma.debt.create({
        data: {
          studentId: student.id,
          amount: amount,
          concept: debtConcept,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
        },
      });

      console.log(`✅ Deuda adicional creada: ID ${newDebt.id} por $${amount.toLocaleString()}`);
    } catch (debtError) {
      console.error("❌ Error creando deuda adicional:", debtError);
      throw new Error("Error al crear deuda adicional");
    }
  }


  /**
   * Genera un recibo digital para el pago
   */
  private async generateDigitalReceipt(
    monthlyPaymentId: number,
    paidAmount: number,
    paymentMethod: string,
    reviewedBy: string
  ) {
    try {
      console.log("📄 Generando recibo digital...");
      const receiptData = await DigitalReceiptService.createReceiptFromMonthlyPayment(
        monthlyPaymentId,
        paidAmount,
        paymentMethod,
        reviewedBy
      );

      console.log(`✅ Recibo digital generado: ${receiptData.receiptNumber}`);
      console.log(`🔗 URL del recibo: ${DigitalReceiptService.generateReceiptUrl(receiptData.id)}`);
      
      return receiptData;
    } catch (receiptError) {
      console.error("❌ Error generando recibo digital:", receiptError);
      throw receiptError;
    }
  }

  /**
   * Envía notificación de WhatsApp cuando se marca un pago como recibido
   */
  private async sendPaymentReceivedNotification(
    payment: any,
    receivedAmount: number,
    paymentMethod: string,
    receiptData: any
  ) {
    try {
      const student = payment.student;
      const period = payment.period;

      if (!student.phone) {
        console.log("⚠️ Estudiante sin teléfono configurado, notificación no enviada");
        return;
      }

      const paymentMethodLabels = {
        TRANSFER: "Transferencia",
        CASH: "Efectivo",
        CARD: "Tarjeta",
        OTHER: "Otro",
      };

      // El expectedAmount ya fue actualizado en la DB con el descuento aplicado
      console.log("💰 Expected amount:", payment.expectedAmount);
      console.log("💰 Received amount:", receivedAmount);
      const isPartialPayment = receivedAmount < payment.expectedAmount;
      const remainingAmount = payment.expectedAmount - receivedAmount;

      // Calcular fecha del próximo pago con día de corte del estudiante (15 o 30)
      const cutoffDay = student.enrollmentData?.paymentCutoffDay ?? 30;
      const nextPaymentDate = await this.calculateNextPaymentDate(period, cutoffDay);

      // Generar URL del recibo
      const receiptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/recibo/${receiptData.id}`;

      const notificationData = {
        studentName: student.name,
        parentPhone: student.phone,
        period: period.name,
        amount: receivedAmount,
        paymentMethod: paymentMethodLabels[paymentMethod as keyof typeof paymentMethodLabels] || paymentMethod,
        receiptUrl,
        isPartialPayment,
        expectedAmount: payment.expectedAmount,
        remainingAmount: isPartialPayment ? remainingAmount : 0,
        paymentStatus: isPartialPayment ? "PARTIAL" : "COMPLETE",
        nextPaymentDate,
      };

      await whatsappService.sendProofApprovedNotification(notificationData);
      console.log("✅ Notificación de pago recibido enviada exitosamente");
    } catch (whatsappError) {
      console.error("❌ Error enviando notificación de pago recibido:", whatsappError);
    }
  }

  /**
   * Calcula la fecha del próximo pago basado en el período actual
   */
  private async calculateNextPaymentDate(currentPeriod: any, cutoffDay: number): Promise<string> {
    try {
      // Calcular el próximo mes
      const currentDate = new Date(currentPeriod.year, currentPeriod.month - 1, 1);
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Buscar si ya existe un período para el próximo mes
      const nextPeriod = await prisma.paymentPeriod.findFirst({
        where: {
          year: nextMonth.getFullYear(),
          month: nextMonth.getMonth() + 1,
          isActive: true,
        },
      });

      if (nextPeriod) {
        // Si existe período, usar el día de corte del mes del período
        const nextPaymentDate = new Date(nextPeriod.year, nextPeriod.month - 1, cutoffDay);
        return nextPaymentDate.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } else {
        // Si no existe período, calcular día de corte del mes siguiente
        const nextPaymentDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), cutoffDay);
        
        return nextPaymentDate.toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }
    } catch (error) {
      console.error("❌ Error calculando fecha del próximo pago:", error);
      return "Fecha por confirmar";
    }
  }

  /**
   * Envía notificaciones de WhatsApp según el estado del comprobante
   */
  private async sendPaymentNotification(proof: any, data: any) {
    try {
      const student = proof.paymentForm.student;
      const period = proof.paymentForm.period;
      const monthlyPayment = proof.paymentForm.monthlyPayment;

      if (!student.phone) {
        console.log("⚠️ Estudiante sin teléfono configurado, notificación no enviada");
        return;
      }

      const paymentMethodLabels = {
        TRANSFER: "Transferencia",
        CASH: "Efectivo",
        CARD: "Tarjeta",
        OTHER: "Otro",
      };

      if (data.status === "APPROVED") {
        await this.sendApprovedNotification(student, period, monthlyPayment, proof, paymentMethodLabels, data.approvedAmount || proof.amount);
      } else if (data.status === "REJECTED") {
        await this.sendRejectedNotification(student, period, monthlyPayment, proof, paymentMethodLabels, data.reviewNotes);
      }
    } catch (whatsappError) {
      console.error("❌ Error enviando notificación de WhatsApp:", whatsappError);
    }
  }

  /**
   * Envía notificación de comprobante aprobado
   */
  private async sendApprovedNotification(
    student: any,
    period: any,
    monthlyPayment: any,
    proof: any,
    paymentMethodLabels: any,
    paidAmount: number
  ) {
    console.log("📤 Enviando notificación de comprobante APROBADO...");

    const remainingAmount = monthlyPayment.expectedAmount - paidAmount;
    const isPartialPayment = remainingAmount > 0;

    // Agregar URL del recibo digital si existe
    let receiptUrl = undefined;
    try {
      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          studentId: student.id,
          concept: { contains: period.name },
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000), // Últimos 5 minutos
          },
        },
        orderBy: { createdAt: "desc" },
      });

      if (existingReceipt) {
        receiptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/recibo/${existingReceipt.id}`;
        console.log(`📄 Recibo encontrado para envío: ${receiptUrl}`);
      }
    } catch (receiptSearchError) {
      console.error("❌ Error buscando recibo digital:", receiptSearchError);
      console.log("⚠️ No se pudo buscar recibo digital para el mensaje");
    }

    const notificationData = {
      studentName: student.name,
      parentPhone: student.phone,
      period: period.name,
      amount: paidAmount,
      paymentMethod: paymentMethodLabels[proof.paymentMethod] || proof.paymentMethod,
      receiptUrl,
      isPartialPayment,
      expectedAmount: monthlyPayment.expectedAmount,
      remainingAmount: isPartialPayment ? remainingAmount : 0,
      paymentStatus: isPartialPayment ? "PARTIAL" : "COMPLETE",
    };

    await whatsappService.sendProofApprovedNotification(notificationData);
    console.log("✅ Notificación de aprobación enviada exitosamente");
  }

  /**
   * Envía notificación de comprobante rechazado
   */
  private async sendRejectedNotification(
    student: any,
    period: any,
    monthlyPayment: any,
    proof: any,
    paymentMethodLabels: any,
    reviewNotes?: string
  ) {
    console.log("📤 Enviando notificación de comprobante RECHAZADO...");

    // Obtener el link del formulario de pago si existe un formulario activo
    const activeForm = await prisma.paymentForm.findFirst({
      where: {
        studentId: student.id,
        periodId: period.id,
        status: "ACTIVE",
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const paymentLink = activeForm ? `${baseUrl}/payment/${activeForm.id}` : undefined;

    const notificationData = {
      studentName: student.name,
      parentPhone: student.phone,
      period: period.name,
      amount: proof.amount,
      paymentMethod: paymentMethodLabels[proof.paymentMethod] || proof.paymentMethod,
      rejectionReason: reviewNotes || "No se especificó motivo del rechazo",
      paymentLink,
      expectedAmount: monthlyPayment.expectedAmount,
    };

    await whatsappService.sendProofRejectedNotification(notificationData);
    console.log("✅ Notificación de rechazo enviada exitosamente");
  }

  /**
   * Obtiene estudiantes con formularios de pago para un período específico
   */
  async getStudentsWithPaymentForms(periodId: number, options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Construir filtros de búsqueda
    const searchFilter = search ? {
      student: {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { id: { contains: search, mode: 'insensitive' as const } }, // id es el documento
          { phone: { contains: search, mode: 'insensitive' as const } } // teléfono
        ]
      }
    } : {};

    const whereClause = {
      periodId,
      ...searchFilter
    };

    // Obtener pagos con formularios y paginación
    const [payments, total] = await Promise.all([
      prisma.monthlyPayment.findMany({
        where: whereClause,
        include: {
          student: true,
          paymentForms: {
            where: { status: 'ACTIVE' },
            take: 1
          }
        },
        skip: offset,
        take: limit,
        orderBy: { student: { name: 'asc' } }
      }),
      prisma.monthlyPayment.count({ where: whereClause })
    ]);

    // Procesar datos para el frontend
    const students = payments.map(payment => ({
      id: payment.student.id,
      name: payment.student.name,
      parentPhone: payment.student.phone,
      hasForm: payment.paymentForms.length > 0,
      paymentFormId: payment.paymentForms[0]?.id || null
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      students,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Obtiene todos los estudiantes con formularios de pago para un período específico (sin paginación)
   */
  async getAllStudentsWithPaymentForms(periodId: number) {
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    const payments = await prisma.monthlyPayment.findMany({
      where: { periodId },
      include: {
        student: true,
        paymentForms: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      },
      orderBy: { student: { name: 'asc' } }
    });

    // Procesar datos para el frontend
    const students = payments.map(payment => ({
      id: payment.student.id,
      name: payment.student.name,
      parentPhone: payment.student.phone,
      hasForm: payment.paymentForms.length > 0,
      paymentFormId: payment.paymentForms[0]?.id || null
    }));

    return students;
  }

  /**
   * Obtiene formularios de pago con paginación para un período específico
   */
  async getPaymentFormsWithPagination(periodId: number, options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Construir filtros de búsqueda
    const searchFilter = search ? {
      student: {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { id: { contains: search, mode: 'insensitive' as const } }, // id es el documento
          { phone: { contains: search, mode: 'insensitive' as const } } // teléfono
        ]
      }
    } : {};

    const whereClause = {
      periodId,
      paymentForms: {
        some: {
          status: 'ACTIVE' as const
        }
      },
      ...searchFilter
    };

    // Obtener pagos con formularios y paginación
    const [payments, total] = await Promise.all([
      prisma.monthlyPayment.findMany({
        where: whereClause,
        include: {
          student: true,
          paymentForms: {
            where: { status: 'ACTIVE' },
            take: 1
          }
        },
        skip: offset,
        take: limit,
        orderBy: { student: { name: 'asc' } }
      }),
      prisma.monthlyPayment.count({ where: whereClause })
    ]);

    // Procesar datos para el frontend
    const paymentForms = payments.map(payment => ({
      id: payment.id,
      student: {
        id: payment.student.id,
        name: payment.student.name,
        phone: payment.student.phone
      },
      expectedAmount: payment.expectedAmount,
      paymentFormId: payment.paymentForms[0]?.id || null
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      paymentForms,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Obtiene pagos con paginación para un período específico
   */
  async getPaymentsWithPagination(periodId: number, options: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}) {
    const { page = 1, limit = 10, search } = options;
    const offset = (page - 1) * limit;

    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Construir filtros de búsqueda
    const searchFilter = search ? {
      student: {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { id: { contains: search, mode: 'insensitive' as const } }, // id es el documento
          { phone: { contains: search, mode: 'insensitive' as const } } // teléfono
        ]
      }
    } : {};

    const whereClause = {
      periodId,
      ...searchFilter
    };

    // Obtener pagos con paginación
    const [payments, total] = await Promise.all([
      prisma.monthlyPayment.findMany({
        where: whereClause,
        include: {
          student: true,
          paymentForms: {
            where: { status: 'ACTIVE' },
            take: 1
          }
        },
        skip: offset,
        take: limit,
        orderBy: { student: { name: 'asc' } }
      }),
      prisma.monthlyPayment.count({ where: whereClause })
    ]);

    // Procesar datos para el frontend
    const processedPayments = payments.map(payment => ({
      id: payment.id,
      student: {
        id: payment.student.id,
        name: payment.student.name,
        phone: payment.student.phone
      },
      expectedAmount: payment.expectedAmount,
      paidAmount: payment.paidAmount,
      status: payment.status,
      paymentDate: payment.paymentDate,
      hasProofs: false, // Por ahora lo dejamos en false, se puede mejorar después
      paymentFormId: payment.paymentForms[0]?.id || null
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      payments: processedPayments,
      pagination: {
        page,
        limit,
        totalCount: total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}

export const monthlyPaymentService = new MonthlyPaymentService();
