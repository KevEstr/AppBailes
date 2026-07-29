import { prisma } from "@/lib/prisma";
import { whatsappService } from "@/lib/whatsapp-service";
import { DigitalReceiptService } from "@/lib/digital-receipt-service";
import { calculatePaymentPeriodForConcept } from '@/lib/period-calculator';
import { logStep, withTimer } from "@/lib/ops-logger";
import { resolveCutoffDay, buildCutoffDaysMap, cutoffMapKey } from '@/lib/payment-utils';

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
   * Nota: La fecha de vencimiento ya no se establece a nivel de período,
   * cada pago tiene su propia fecha de vencimiento basada en el día de corte del estudiante
   */
  async createPaymentPeriod(data: {
    year: number;
    month: number;
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
        isActive: true,
      },
    });
  }

  /**
   * Genera pagos mensuales para todos los estudiantes activos
   * Ahora genera un pago por cada clase inscrita del estudiante
   * Actualiza pagos existentes si cambió el valor de la mensualidad
   */
  async generateMonthlyPayments(periodId: number, regenerate: boolean = false) {
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new Error("Período no encontrado");
    }

    // Obtener estudiantes activos con sus datos de inscripción y clases
    const activeStudents = await prisma.student.findMany({
      where: { isActive: true },
      include: {
        enrollmentData: true,
        classEnrollments: {
          where: { isActive: true },
          select: {
            id: true,
            studentId: true,
            classId: true,
            isActive: true,
            paymentCutoffDay: true,
            monthlyFee: true,
            enrolledAt: true,
            createdAt: true,
            updatedAt: true,
            danceClass: {
              select: { 
                id: true,
                name: true,
                sport: true 
              }
            }
          }
        }
      }
    });

    const monthlyPayments = [] as any[];
    const updatedPayments = [] as any[];
    const deletedPayments = [] as any[];

    for (const student of activeStudents) {
      // Clases activas del estudiante. Se hoistea aquí porque lo usan tanto la rama de
      // cobertura por cadena (dentro del bucle de inscripciones activas) como la limpieza
      // de huérfanos al final del bucle del estudiante.
      const activeClassIds = student.classEnrollments.map(e => e.danceClass.id);

      // Cadena dirigida de transferencias del estudiante. NO se filtra por transferredAt:
      // la cadena modela la relación fromClassId -> toClassId, no una ventana temporal.
      // Determinismo: transferredAt asc, id asc (mismo convenio que receipt-cutoff-from-transfer-destination).
      const studentTransfers = await prisma.studentTransfer.findMany({
        where: { studentId: student.id },
        orderBy: [{ transferredAt: 'asc' }, { id: 'asc' }],
      });

      const chainMap = new Map<number, Array<{ toClassId: number; transferredAt: Date; id: number }>>();
      for (const t of studentTransfers) {
        const edges = chainMap.get(t.fromClassId) ?? [];
        edges.push({ toClassId: t.toClassId, transferredAt: t.transferredAt, id: t.id });
        chainMap.set(t.fromClassId, edges);
      }

      // Pagos PAID/PARTIAL_PAID del estudiante en el período cuyo classId NO está entre
      // las inscripciones activas. Se carga una sola vez por estudiante; la rama de cobertura
      // por cadena (dentro del else del bucle) la consulta para cada inscripción activa.
      const allPaidInactivePaymentsForPeriod = await prisma.monthlyPayment.findMany({
        where: {
          studentId: student.id,
          periodId: period.id,
          status: { in: ['PAID', 'PARTIAL_PAID'] },
          classId: { notIn: activeClassIds },
        },
      });

      // Procesar cada clase inscrita del estudiante
      for (const enrollment of student.classEnrollments) {
        // Selección idempotente del pago existente para la terna (studentId, classId, periodId).
        // findFirst sin orden ni filtro de status podía devolver la fila PENDING del saldo
        // restante de un parcial y reescribirla con la mensualidad completa. Para evitarlo se
        // prioriza la fila "principal" (PAID/PARTIAL_PAID) y nunca el restante derivado de un parcial.
        const paymentsForTriple = await prisma.monthlyPayment.findMany({
          where: {
            studentId: student.id,
            classId: enrollment.danceClass.id,
            periodId: period.id,
          },
        });

        const principalPayment = paymentsForTriple.find(
          (p) => p.status === "PAID" || p.status === "PARTIAL_PAID"
        );
        const pendingPayment = paymentsForTriple.find(
          (p) => p.status === "PENDING" || p.status === "OVERDUE"
        );

        // Cuando la terna ya tiene un principal saldado/parcial, su restante PENDING NO debe
        // usarse como existingPayment a reescribir; se selecciona el principal de forma determinista.
        const existingPayment = principalPayment ?? pendingPayment ?? paymentsForTriple[0] ?? null;

        // Resolver la tarifa para esta clase específica
        const { amount, feeConfigId } = await this.resolveClassFeeAndConfig(student, enrollment);

        // Validar si hay transferencia a esta clase DENTRO del período
        // Solo considerar transferencias que ocurrieron durante el período específico
        const periodStart = new Date(period.year, period.month - 1, 1);
        const periodEnd = new Date(period.year, period.month, 1);
        
        const transferToThisClass = await prisma.studentTransfer.findFirst({
          where: {
            studentId: student.id,
            toClassId: enrollment.danceClass.id,
            transferredAt: {
              gte: periodStart,
              lt: periodEnd
            }
          }
        });

        if (transferToThisClass) {
          // Hay transferencia a esta clase DENTRO del período
          // Verificar si ya pagó en la clase anterior
          const paidPaymentFromPreviousClass = await prisma.monthlyPayment.findFirst({
            where: {
              studentId: student.id,
              classId: transferToThisClass.fromClassId,
              periodId: period.id,
              status: { in: ['PAID', 'PARTIAL_PAID'] }
            }
          });

          if (paidPaymentFromPreviousClass) {
            // Ya pagó en la clase anterior → No crear nuevo pago
            // Si existe un pago para la clase nueva, eliminarlo (es duplicado)
            if (existingPayment && (existingPayment.status === 'PENDING' || existingPayment.status === 'OVERDUE')) {
              await prisma.monthlyPayment.delete({
                where: { id: existingPayment.id }
              });
            }
            continue;
          }

          // Si no pagó, verificar si hay un pago PENDING/OVERDUE en la clase vieja
          const pendingPaymentFromPreviousClass = await prisma.monthlyPayment.findFirst({
            where: {
              studentId: student.id,
              classId: transferToThisClass.fromClassId,
              periodId: period.id,
              status: { in: ['PENDING', 'OVERDUE'] }
            }
          });

          if (pendingPaymentFromPreviousClass) {
            // Hay pago PENDING en la clase vieja → Actualizarlo para que apunte a la clase nueva
            // Si existe un pago para la clase nueva, eliminarlo primero (es duplicado)
            if (existingPayment && (existingPayment.status === 'PENDING' || existingPayment.status === 'OVERDUE')) {
              await prisma.monthlyPayment.delete({
                where: { id: existingPayment.id }
              });
            }

            // Calcular nueva fecha de vencimiento basada en el día de corte de la nueva clase
            const dueDate = this.calculateDueDate(
              enrollment.paymentCutoffDay ?? 30, 
              { year: period.year, month: period.month }
            );

            const updatedPayment = await prisma.monthlyPayment.update({
              where: { id: pendingPaymentFromPreviousClass.id },
              data: {
                classId: enrollment.danceClass.id,
                feeConfigId: feeConfigId,
                expectedAmount: amount,
                dueDate: dueDate,
                notes: `Mensualidad ${period.name} - ${enrollment.danceClass.name} (${enrollment.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}) (Corte día ${enrollment.paymentCutoffDay ?? 30})`,
                // Mantener el estado (PENDING o OVERDUE)
                status: pendingPaymentFromPreviousClass.status,
              },
            });

            updatedPayments.push(updatedPayment);
            continue; // Ya actualizamos el pago, no crear uno nuevo
          }
          // Si no hay pago PENDING en la clase vieja, continuar con el flujo normal
        } else {
          // NO hay transferencia dentro del período.
          // Determinar si la inscripción activa A es destino de una cadena dirigida de
          // student_transfers que parte de algún classId con PAID/PARTIAL_PAID en el
          // período (clase inactiva del estudiante). Solo en ese caso el pago en la
          // clase origen cuenta como cobertura del principal de A.
          const coveredByChain = allPaidInactivePaymentsForPeriod.some(paid =>
            this.coversEnrollmentByTransferChain(paid.classId as number, enrollment.danceClass.id, chainMap)
          );

          if (coveredByChain) {
            // A es destino de cadena: el principal vive en la clase inactiva. No crear
            // nuevo pago para A; eliminar el PENDING/OVERDUE de A si existe (duplicado).
            // Nunca eliminar PAID/PARTIAL_PAID.
            if (existingPayment && (existingPayment.status === 'PENDING' || existingPayment.status === 'OVERDUE')) {
              await prisma.monthlyPayment.delete({
                where: { id: existingPayment.id }
              });
            }
            continue;
          }
          // A NO está cubierta por cadena: NO eliminar PENDING/OVERDUE existente; caer
          // al flujo normal de creación/actualización para garantizar la cobranza.
        }

        if (!existingPayment) {
          // Calcular fecha de vencimiento basada en el día de corte de la clase
          const dueDate = this.calculateDueDate(
            enrollment.paymentCutoffDay ?? 30, 
            { year: period.year, month: period.month }
          );

          // Crear nuevo pago si no existe
          const monthlyPayment = await prisma.monthlyPayment.create({
            data: {
              studentId: student.id,
              classId: enrollment.danceClass.id,
              periodId: period.id,
              feeConfigId: feeConfigId,
              expectedAmount: amount,
              status: "PENDING",
              dueDate: dueDate,
              notes: `Mensualidad ${period.name} - ${enrollment.danceClass.name} (${enrollment.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}) (Corte día ${enrollment.paymentCutoffDay ?? 30})`,
            },
          });

          monthlyPayments.push(monthlyPayment);
        } else if (regenerate || existingPayment.expectedAmount !== amount || existingPayment.feeConfigId !== feeConfigId) {
          // Calcular nueva fecha de vencimiento basada en el día de corte de la clase
          const dueDate = this.calculateDueDate(
            enrollment.paymentCutoffDay ?? 30, 
            { year: period.year, month: period.month }
          );

          // Actualizar pago existente si:
          // 1. Se solicita regeneración explícita (regenerate = true)
          // 2. El monto esperado cambió
          // 3. La configuración de tarifa cambió
          const isLockedStatus = existingPayment.status === "PAID" || existingPayment.status === "PARTIAL_PAID";

          const updatedPayment = await prisma.monthlyPayment.update({
            where: { id: existingPayment.id },
            data: {
              expectedAmount: amount,
              feeConfigId: feeConfigId,
              dueDate: dueDate,
              // Preservar las notas humanas (p. ej. "Pago parcial: $X de $Y. Saldo
              // restante: $Z") cuando el pago ya está en PAID/PARTIAL_PAID. Solo se
              // reescribe con la nota canónica de mensualidad cuando el pago aún
              // está pendiente o vencido y por tanto no tiene traza de parcial.
              ...(isLockedStatus
                ? {}
                : {
                    notes: `Mensualidad ${period.name} - ${enrollment.danceClass.name} (${enrollment.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}) (Corte día ${enrollment.paymentCutoffDay ?? 30})`,
                  }),
              // Solo cambiar estado a PENDING si el pago no ha sido pagado
              status: isLockedStatus ? existingPayment.status : "PENDING",
            },
          });

          updatedPayments.push(updatedPayment);
        }
      }

      // Limpiar pagos huérfanos: eliminar pagos de clases donde el estudiante ya no está inscrito
      // Obtener todos los pagos del estudiante para este período
      const allStudentPayments = await prisma.monthlyPayment.findMany({
        where: {
          studentId: student.id,
          periodId: period.id,
        },
      });

      // Eliminar pagos de clases donde el estudiante ya no está inscrito
      // (activeClassIds está hoisteado al inicio del bucle del estudiante)
      for (const payment of allStudentPayments) {
        if (payment.classId && !activeClassIds.includes(payment.classId)) {
          // Solo eliminar si está pendiente o vencido (no pagos completados para mantener historial)
          if (payment.status === 'PENDING' || payment.status === 'OVERDUE') {
            // Proteger restantes de pagos parciales: si la misma terna (studentId, classId, periodId)
            // tiene un PARTIAL_PAID, este PENDING es el saldo restante y NO debe eliminarse.
            const hasPartialInSameTriple = allStudentPayments.some(
              (p) => p.classId === payment.classId && p.status === 'PARTIAL_PAID' && p.id !== payment.id
            );
            if (hasPartialInSameTriple) continue;

            const deletedPayment = await prisma.monthlyPayment.delete({
              where: { id: payment.id }
            });
            deletedPayments.push(deletedPayment);
          }
        }
      }
    }

    return {
      created: monthlyPayments,
      updated: updatedPayments,
      deleted: deletedPayments,
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
   * Resuelve la tarifa y configuración para una clase específica
   * Prioridad: 1) Mensualidad específica de la clase, 2) Mensualidad individual del estudiante, 3) Por deporte, 4) Configuración global
   */
  async resolveClassFeeAndConfig(student: any, enrollment: any): Promise<{ amount: number; feeConfigId: number }> {
    // 1. Si la clase tiene mensualidad específica configurada, usarla
    if (enrollment.monthlyFee && enrollment.monthlyFee > 0) {
      
      // Buscar o crear configuración para esta clase específica
      let feeConfig = await prisma.monthlyFeeConfig.findFirst({
        where: {
          sport: enrollment.danceClass.sport as any,
          isActive: true,
          validFrom: { lte: new Date() },
          OR: [
            { validUntil: null },
            { validUntil: { gte: new Date() } }
          ]
        },
        orderBy: { validFrom: 'desc' }
      });

      if (!feeConfig) {
        // Crear configuración temporal para esta clase
        feeConfig = await prisma.monthlyFeeConfig.create({
          data: {
            amount: enrollment.monthlyFee,
            description: `Configuración específica para ${enrollment.danceClass.name}`,
            sport: enrollment.danceClass.sport as any,
            isActive: true,
            validFrom: new Date(),
            createdBy: 'system'
          }
        });
      }

      return { amount: enrollment.monthlyFee, feeConfigId: feeConfig.id };
    }

    // 2. Si el estudiante tiene mensualidad individual configurada, usarla
    if (student.enrollmentData?.monthlyFee && student.enrollmentData.monthlyFee > 0) {
      
      const feeConfig = await this.getOrCreateFeeConfig(enrollment.danceClass.sport as any, student.enrollmentData.monthlyFee);
      return { amount: student.enrollmentData.monthlyFee, feeConfigId: feeConfig.id };
    }

    // 3. Determinar mensualidad por deporte usando la tabla monthly_fee_configs
    const feeConfig = await prisma.monthlyFeeConfig.findFirst({
      where: {
        sport: enrollment.danceClass.sport as any,
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      orderBy: { validFrom: 'desc' }
    });

    if (feeConfig) {
      return { amount: feeConfig.amount, feeConfigId: feeConfig.id };
    }

    // 4. Usar configuración global como fallback
    const globalFeeConfig = await prisma.monthlyFeeConfig.findFirst({
      where: {
        sport: null, // Configuración global
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      orderBy: { validFrom: 'desc' }
    });

    if (globalFeeConfig) {
      return { amount: globalFeeConfig.amount, feeConfigId: globalFeeConfig.id };
    }

    throw new Error(`No se pudo determinar la mensualidad para el estudiante ${student.name} en la clase ${enrollment.danceClass.name}. Configure las tarifas en la configuración de mensualidades.`);
  }

  /**
   * Determina si existe una cadena dirigida de student_transfers (>= 1 salto) que parte
   * de paidClassId y termina en enrollmentClassId.
   *
   * Helper puro: no consulta la base de datos. DFS acotado a MAX_HOPS=10 con un set
   * `visited` para garantizar terminación en presencia de ciclos (A -> B -> A).
   *
   * Devuelve false cuando paidClassId === enrollmentClassId (mismo classId no constituye
   * cadena de >= 1 salto).
   */
  private coversEnrollmentByTransferChain(
    paidClassId: number,
    enrollmentClassId: number,
    chainMap: Map<number, Array<{ toClassId: number; transferredAt: Date; id: number }>>
  ): boolean {
    const MAX_HOPS = 10;

    if (paidClassId === enrollmentClassId) return false;

    const visited = new Set<number>();
    const stack: Array<{ node: number; depth: number }> = [{ node: paidClassId, depth: 0 }];

    while (stack.length > 0) {
      const current = stack.pop()!;
      if (current.depth >= MAX_HOPS) continue;
      if (visited.has(current.node)) continue;
      visited.add(current.node);

      const edges = chainMap.get(current.node) ?? [];
      for (const e of edges) {
        if (e.toClassId === enrollmentClassId) return true;
        if (!visited.has(e.toClassId)) {
          stack.push({ node: e.toClassId, depth: current.depth + 1 });
        }
      }
    }

    return false;
  }

  /**
   * Calcula la fecha de vencimiento basada en el día de corte de la clase
   * @param cutoffDay Día de corte (15 o 30)
   * @param period Año y mes del período
   * @returns Fecha de vencimiento calculada
   */
  private calculateDueDate(cutoffDay: number, period: { year: number; month: number }): Date {
    const { year, month } = period;
    
    // Calcular el mes de vencimiento
    let dueMonth = month;
    let dueYear = year;
    
    if (cutoffDay === 15) {
      // Para corte del 15, vence el 20 del mismo mes
      dueMonth = month;
      dueYear = year;
    } else if (cutoffDay === 30) {
      // Para corte del 30, vence el 5 del mes siguiente
      dueMonth = month + 1;
      if (dueMonth > 12) {
        dueMonth = 1;
        dueYear = year + 1;
      }
    } else {
      // Fallback: vence 5 días después del corte
      dueMonth = month;
      dueYear = year;
    }
    
    // Crear la fecha de vencimiento
    const dueDay = cutoffDay === 15 ? 20 : 5;
    const dueDate = new Date(dueYear, dueMonth - 1, dueDay, 23, 59, 59);
        
    return dueDate;
  }

  /**
   * Obtiene o crea una configuración de tarifa para un deporte específico
   */
  private async getOrCreateFeeConfig(sport: any, amount: number): Promise<any> {
    let feeConfig = await prisma.monthlyFeeConfig.findFirst({
      where: {
        sport: sport,
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } }
        ]
      },
      orderBy: { validFrom: 'desc' }
    });

    if (!feeConfig) {
      feeConfig = await prisma.monthlyFeeConfig.create({
        data: {
          amount: amount,
          description: `Configuración automática para ${sport}`,
          sport: sport,
          isActive: true,
          validFrom: new Date(),
          createdBy: 'system'
        }
      });
    }

    return feeConfig;
  }

  /**
   * Resuelve el monto y feeConfigId por estudiante considerando override individual y deporte
   * @deprecated Usar resolveClassFeeAndConfig para pagos por clase
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
   *
   * Usa una transacción de Prisma para garantizar atomicidad:
   * si la creación del pago pendiente por adeudo falla, el pago original
   * NO queda marcado como PARTIAL_PAID.
   */
  async markPaymentAsReceived(
    paymentId: number,
    data: {
      paymentMethod: "CASH" | "TRANSFER" | "CARD";
      receivedAmount?: number;
      additionalDebt?: number;
      discount?: number;
      markedBy: string;
      correlationId?: string;
      additionalPayment?: {
        type: "ENROLLMENT";
        amount: number;
        paymentMethod?: "CASH" | "TRANSFER" | "CARD";
      };
    }
  ) {
    const correlationId = data.correlationId || `payment-${paymentId}`;
    const t = withTimer();
    logStep({
      correlationId,
      scope: "monthlyPaymentService.markPaymentAsReceived",
      step: "start",
      verbose: true,
      data: {
        paymentId,
        paymentMethod: data.paymentMethod,
        hasReceivedAmount: typeof data.receivedAmount !== "undefined",
        hasAdditionalDebt: typeof data.additionalDebt !== "undefined",
        hasDiscount: typeof data.discount !== "undefined",
        hasAdditionalPayment: typeof data.additionalPayment !== "undefined",
        markedBy: data.markedBy,
      },
    });

    // ═══════════════════════════════════════════════════════════════
    // FASE 1: Lecturas y validaciones (fuera de la transacción)
    // ═══════════════════════════════════════════════════════════════
    const readTimer = withTimer();
    const payment = await prisma.monthlyPayment.findUnique({
      where: { id: paymentId },
      include: { 
        student: true, 
        period: true, 
        feeConfig: true,
        danceClass: {
          select: { id: true, name: true, sport: true }
        }
      },
    });
    logStep({
      correlationId,
      scope: "monthlyPaymentService.markPaymentAsReceived",
      step: "db.payment.findUnique.done",
      verbose: true,
      data: {
        paymentId,
        found: Boolean(payment),
        ms: readTimer.ms(),
        status: payment?.status,
        classId: payment?.classId ?? null,
        studentId: payment?.studentId ?? null,
      },
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

    if (discountAmount > 0) {
      // noisy console log removed; structured logs cover amounts
    }
    
    const receivedAmount = data.receivedAmount || effectiveExpectedAmount;
    const isPartialPayment = receivedAmount < effectiveExpectedAmount;
    const newStatus: "PAID" | "PARTIAL_PAID" = isPartialPayment ? "PARTIAL_PAID" : "PAID";

    // Invariante de conciliación (pago parcial): received + additionalDebt + discount == expected.
    // Se valida del lado del servidor ANTES de la transacción para rechazar de forma atómica
    // (sin cambio de estado, sin recibo, sin restante) cualquier conciliación inconsistente.
    const additionalDebt = data.additionalDebt ?? 0;
    if (isPartialPayment) {
      const reconciliationDelta = Math.abs((receivedAmount + additionalDebt + discountAmount) - baseAmount);
      if (reconciliationDelta > 0.01) {
        throw new Error(
          `PARTIAL_AMOUNT_MISMATCH: la conciliación del pago parcial no cuadra ` +
          `(recibido ${receivedAmount} + adeudo ${additionalDebt} + descuento ${discountAmount} != esperado ${baseAmount}).`
        );
      }
    }
    logStep({
      correlationId,
      scope: "monthlyPaymentService.markPaymentAsReceived",
      step: "amounts.calculated",
      verbose: true,
      data: {
        paymentId,
        baseAmount,
        discountAmount,
        effectiveExpectedAmount,
        receivedAmount,
        isPartialPayment,
        newStatus,
      },
    });

    // Resolver la clase para el pago restante (si aplica)
    let danceClassForRemaining: { id: number; name: string; sport: string } | null = payment.danceClass;
    if (!danceClassForRemaining && payment.classId != null) {
      const classTimer = withTimer();
      danceClassForRemaining = await prisma.danceClass.findUnique({
        where: { id: payment.classId },
        select: { id: true, name: true, sport: true },
      });
      logStep({
        correlationId,
        scope: "monthlyPaymentService.markPaymentAsReceived",
        step: "db.danceClass.findUnique.done",
        verbose: true,
        data: {
          paymentId,
          classId: payment.classId,
          found: Boolean(danceClassForRemaining),
          ms: classTimer.ms(),
        },
      });
    }
    if (isPartialPayment && !danceClassForRemaining) {
      throw new Error(
        "No se puede registrar el adeudo: el pago debe tener una clase asociada. " +
        "Verifique que el pago tenga classId y que la clase exista en la base de datos."
      );
    }

    // Pre-calcular datos para el pago pendiente ANTES de la transacción
    // para que cualquier fallo de lectura ocurra antes de modificar la DB
    let remainingPaymentData: {
      remainingAmount: number;
      feeConfigId: number;
      dueDate: Date;
      cutoffDay: number;
    } | null = null;

    if (isPartialPayment && danceClassForRemaining) {
      const remainingAmount = effectiveExpectedAmount - receivedAmount;

      // Doble verificación: el restante calculado debe coincidir con additionalDebt.
      // El restante persistido debe ser igual a additionalDebt Y a effectiveExpectedAmount - receivedAmount.
      if (Math.abs(remainingAmount - additionalDebt) > 0.01) {
        throw new Error(
          `PARTIAL_AMOUNT_MISMATCH: el restante calculado (${remainingAmount}) no coincide con el adeudo ingresado (${additionalDebt}).`
        );
      }

      const feeTimer = withTimer();
      const feeConfig = await prisma.monthlyFeeConfig.findFirst({
        where: { 
          isActive: true,
          sport: danceClassForRemaining.sport as any
        },
        orderBy: { id: 'desc' },
      });
      logStep({
        correlationId,
        scope: "monthlyPaymentService.markPaymentAsReceived",
        step: "db.monthlyFeeConfig.findFirst.done",
        verbose: true,
        data: {
          paymentId,
          sport: danceClassForRemaining.sport,
          found: Boolean(feeConfig),
          ms: feeTimer.ms(),
        },
      });

      if (!feeConfig) {
        throw new Error(`No hay configuración de mensualidad activa para ${danceClassForRemaining.sport}`);
      }

      const enrollmentTimer = withTimer();
      const cutoffDay = await resolveCutoffDay(payment.studentId, danceClassForRemaining.id);
      logStep({
        correlationId,
        scope: "monthlyPaymentService.markPaymentAsReceived",
        step: "db.classEnrollment.findFirst.done",
        verbose: true,
        data: {
          paymentId,
          classId: danceClassForRemaining.id,
          studentId: payment.studentId,
          cutoffDay,
          ms: enrollmentTimer.ms(),
        },
      });

      const dueDate = this.calculateDueDate(
        cutoffDay, 
        { year: payment.period.year, month: payment.period.month }
      );

      remainingPaymentData = {
        remainingAmount,
        feeConfigId: feeConfig.id,
        dueDate,
        cutoffDay,
      };

      // noisy console logs removed; structured logs cover remainingPayment.prepared
      logStep({
        correlationId,
        scope: "monthlyPaymentService.markPaymentAsReceived",
        step: "remainingPayment.prepared",
        verbose: true,
        data: {
          paymentId,
          remainingAmount,
          dueDate: dueDate.toISOString(),
          cutoffDay: remainingPaymentData.cutoffDay,
        },
      });
    }

    // Pre-calcular notas del pago
    const paymentNotesText = this.generatePaymentNotes(data, receivedAmount, effectiveExpectedAmount, baseAmount, isPartialPayment);
    const originalNotes = payment.notes || '';
    const notes = originalNotes
      ? `${originalNotes} | ${paymentNotesText}`
      : paymentNotesText;
    logStep({
      correlationId,
      scope: "monthlyPaymentService.markPaymentAsReceived",
      step: "notes.generated",
      verbose: true,
      data: {
        paymentId,
        notes,
      },
    });

    // Pre-calcular datos para el recibo (sin queries adicionales si ya son parciales)
    const additionalTotal = data.additionalPayment ? data.additionalPayment.amount : 0;
    const totalAmountForReceipt = receivedAmount + additionalTotal;
    const additionalMethodNote = data.additionalPayment?.paymentMethod
      ? ` | Inscripción vía ${data.additionalPayment.paymentMethod}`
      : '';
    const RECEIPT_METHOD_MAP: Record<string, 'CASH' | 'TRANSFER' | 'CARD'> = {
      CASH: 'CASH', TRANSFER: 'TRANSFER', CARD: 'CARD',
      efectivo: 'CASH', transferencia: 'TRANSFER', tarjeta: 'CARD',
      nequi: 'TRANSFER', daviplata: 'TRANSFER',
    };
    const mappedPaymentMethod: 'CASH' | 'TRANSFER' | 'CARD' = RECEIPT_METHOD_MAP[data.paymentMethod] || 'CASH';

    // Obtener día de corte (necesario para el API route al calcular nextPaymentDate)
    let enrollmentCutoffDay = 30;
    if (payment.classId) {
      if (isPartialPayment && remainingPaymentData) {
        enrollmentCutoffDay = remainingPaymentData.cutoffDay;
      } else {
        enrollmentCutoffDay = await resolveCutoffDay(payment.studentId, payment.classId);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 2: Escrituras atómicas (dentro de la transacción)
    // Incluye: actualización del pago + pago restante (si parcial) + RECIBO.
    // Todo o nada: si falla cualquier paso, se revierte todo.
    // ═══════════════════════════════════════════════════════════════
    let remainingPaymentId: number | null = null;
    let createdReceiptId: number | null = null;

    const txTimer = withTimer();
    const updatedPayment = await prisma.$transaction(async (tx) => {
      // Aplicar descuento si corresponde
      if (discountAmount > 0) {
        logStep({
          correlationId,
          scope: "monthlyPaymentService.markPaymentAsReceived",
          step: "tx.applyDiscount.update_expectedAmount",
          verbose: true,
          data: { paymentId, effectiveExpectedAmount },
        });
        await tx.monthlyPayment.update({
          where: { id: paymentId },
          data: { expectedAmount: effectiveExpectedAmount }
        });
      }

      // Actualizar el pago (status, monto pagado, etc.)
      const updated = await tx.monthlyPayment.update({
        where: { id: paymentId },
        data: {
          status: newStatus,
          paidAmount: receivedAmount,
          paymentDate: new Date(),
          approvedBy: data.markedBy,
          notes,
        },
      });
      logStep({
        correlationId,
        scope: "monthlyPaymentService.markPaymentAsReceived",
        step: "tx.monthlyPayment.update.done",
        verbose: true,
        data: { paymentId, newStatus },
      });

      // Crear pago pendiente por el saldo restante (solo si es parcial)
      if (isPartialPayment && danceClassForRemaining && remainingPaymentData) {
        const remainingPayment = await tx.monthlyPayment.create({
          data: {
            studentId: payment.studentId,
            classId: danceClassForRemaining.id,
            periodId: payment.periodId,
            feeConfigId: remainingPaymentData.feeConfigId,
            expectedAmount: remainingPaymentData.remainingAmount,
            status: "PENDING",
            dueDate: remainingPaymentData.dueDate,
            notes: `Saldo restante de pago parcial - ${payment.period.name} - ${danceClassForRemaining.name} (${danceClassForRemaining.sport === 'DANCE' ? 'Baile' : 'Voleibol'}) (Corte día ${remainingPaymentData.cutoffDay})`,
          },
        });
        remainingPaymentId = remainingPayment.id;
        logStep({
          correlationId,
          scope: "monthlyPaymentService.markPaymentAsReceived",
          step: "tx.remainingPayment.create.done",
          verbose: true,
          data: {
            paymentId,
            remainingPaymentId,
            remainingAmount: remainingPaymentData.remainingAmount,
          },
        });
      }

      // Crear recibo atómicamente con el pago (si falla, todo revierte)
      const receipt = await tx.receipt.create({
        data: {
          studentId: payment.studentId,
          monthlyPaymentId: paymentId,
          amount: totalAmountForReceipt,
          concept: '',
          paymentMethod: mappedPaymentMethod,
          notes: `Pago aprobado por ${data.markedBy}${additionalMethodNote}`,
          whatsappSent: false,
        },
      });
      createdReceiptId = receipt.id;
      logStep({
        correlationId,
        scope: "monthlyPaymentService.markPaymentAsReceived",
        step: "tx.receipt.create.done",
        verbose: true,
        data: { paymentId, receiptId: receipt.id },
      });

      return updated;
    }, {
      maxWait: 10000,
      timeout: 20000,
    });
    logStep({
      correlationId,
      scope: "monthlyPaymentService.markPaymentAsReceived",
      step: "tx.done",
      verbose: true,
      data: { paymentId, ms: txTimer.ms() },
    });

    // ═══════════════════════════════════════════════════════════════
    // FASE 2.5: Verificación post-transacción
    // Garantiza que si era pago parcial, el pago restante realmente
    // existe en la base de datos. Si no, revierte el status.
    // ═══════════════════════════════════════════════════════════════
    if (isPartialPayment && remainingPaymentData) {
      if (!remainingPaymentId) {
        logStep({
          correlationId,
          scope: "monthlyPaymentService.markPaymentAsReceived",
          step: "verify.remainingPaymentId.missing",
          level: "error",
          data: { paymentId, elapsedMs: t.ms() },
        });
        await prisma.monthlyPayment.update({
          where: { id: paymentId },
          data: {
            status: payment.status,
            paidAmount: payment.paidAmount,
            paymentDate: payment.paymentDate,
            approvedBy: payment.approvedBy,
            notes: payment.notes,
            expectedAmount: payment.expectedAmount,
          },
        });
        if (createdReceiptId) {
          await prisma.receipt.delete({ where: { id: createdReceiptId } }).catch(() => {});
        }
        throw new Error(
          `Error crítico: el pago parcial fue registrado pero el pago pendiente por $${remainingPaymentData.remainingAmount.toLocaleString()} no se creó. ` +
          `La operación ha sido revertida. Por favor intente de nuevo.`
        );
      }

      const verification = await prisma.monthlyPayment.findUnique({
        where: { id: remainingPaymentId },
        select: { id: true, expectedAmount: true, status: true },
      });

      if (!verification) {
        logStep({
          correlationId,
          scope: "monthlyPaymentService.markPaymentAsReceived",
          step: "verify.remainingPayment.notFound",
          level: "error",
          data: { paymentId, remainingPaymentId, elapsedMs: t.ms() },
        });
        await prisma.monthlyPayment.update({
          where: { id: paymentId },
          data: {
            status: payment.status,
            paidAmount: payment.paidAmount,
            paymentDate: payment.paymentDate,
            approvedBy: payment.approvedBy,
            notes: payment.notes,
            expectedAmount: payment.expectedAmount,
          },
        });
        if (createdReceiptId) {
          await prisma.receipt.delete({ where: { id: createdReceiptId } }).catch(() => {});
        }
        throw new Error(
          `Error crítico: el pago pendiente por $${remainingPaymentData.remainingAmount.toLocaleString()} no se encontró en la base de datos después de la transacción. ` +
          `La operación ha sido revertida. Por favor intente de nuevo.`
        );
      }

      logStep({
        correlationId,
        scope: "monthlyPaymentService.markPaymentAsReceived",
        step: "verify.remainingPayment.ok",
        verbose: true,
        data: {
          paymentId,
          remainingPaymentId: verification.id,
          remainingExpectedAmount: verification.expectedAmount,
          remainingStatus: verification.status,
        },
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // FASE 3: Operaciones no-críticas (fuera de la transacción)
    // Estas operaciones pueden fallar sin dejar inconsistencias.
    // ═══════════════════════════════════════════════════════════════

    // Actualizar estado de deuda del estudiante
    const debtTimer = withTimer();
    await this.updateStudentDebtStatus(payment.studentId);
    logStep({
      correlationId,
      scope: "monthlyPaymentService.markPaymentAsReceived",
      step: "studentDebtStatus.updated",
      verbose: true,
      data: { paymentId, studentId: payment.studentId, ms: debtTimer.ms() },
    });

    // Procesar pago adicional si se especificó
    if (data.additionalPayment) {
      const additionalTimer = withTimer();
      await this.processAdditionalPayment(payment.student, data.additionalPayment, data.markedBy, payment.classId || 0);
      logStep({
        correlationId,
        scope: "monthlyPaymentService.markPaymentAsReceived",
        step: "additionalPayment.processed",
        verbose: true,
        data: { paymentId, ms: additionalTimer.ms(), additionalPayment: data.additionalPayment },
      });
    }

    logStep({
      correlationId,
      scope: "monthlyPaymentService.markPaymentAsReceived",
      step: "done",
      verbose: true,
      data: { paymentId, receiptId: createdReceiptId, totalMs: t.ms() },
    });

    return {
      payment: updatedPayment,
      receiptId: createdReceiptId,
      sourcePayment: payment,
      cutoffDay: enrollmentCutoffDay,
    };
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
          danceClass: {
            select: { id: true, name: true, sport: true }
          }
        },
        skip: offset,
        take: limit,
        orderBy: { student: { name: 'asc' } }
      }),
      prisma.monthlyPayment.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / limit);

    // Obtener días de corte para pagos que no tienen dueDate
    const paymentsWithoutDueDate = payments.filter(p => !p.dueDate);
    const cutoffDaysMap = new Map<string, number>();

    if (paymentsWithoutDueDate.length > 0) {
      const classIds = [...new Set(paymentsWithoutDueDate.map(p => p.classId).filter((id): id is number => id !== null))];
      const studentIds = [...new Set(paymentsWithoutDueDate.map(p => p.studentId))];

      if (classIds.length > 0) {
        const enrollments = await prisma.classEnrollment.findMany({
          where: {
            classId: { in: classIds },
            studentId: { in: studentIds },
            isActive: true
          },
          select: {
            studentId: true,
            classId: true,
            paymentCutoffDay: true
          }
        });

        buildCutoffDaysMap(enrollments).forEach((value, key) => cutoffDaysMap.set(key, value));
      }
    }

    return {
      payments: payments.map(payment => {
        // Calcular fecha de vencimiento si no existe
        let dueDate = payment.dueDate;
        if (!dueDate) {
          const cutoffDay = cutoffDaysMap.get(cutoffMapKey(payment.studentId, payment.classId)) ?? 30;
          
          // Calcular fecha de vencimiento basada en el período
          dueDate = this.calculateDueDate(cutoffDay, {
            year: payment.period.year,
            month: payment.period.month
          });
        }
        
        return {
          id: payment.id,
          student: {
            id: payment.student.id,
            name: payment.student.name,
            phone: payment.student.phone
          },
          class: payment.danceClass ? {
            id: payment.danceClass.id,
            name: payment.danceClass.name,
            sport: payment.danceClass.sport
          } : null,
          expectedAmount: payment.expectedAmount,
          paidAmount: payment.paidAmount,
          status: payment.status,
          period: payment.period.name,
          dueDate: dueDate,
          isOverdue: new Date() > dueDate && (payment.status === 'PENDING' || payment.status === 'OVERDUE'),
          createdAt: payment.createdAt,
          paymentDate: payment.paymentDate,
          reminderSent: (payment as any).reminderSent || false,
          reminderSentAt: (payment as any).reminderSentAt || null,
          receiptSent: (payment as any).receiptSent || false,
          receiptSentAt: (payment as any).receiptSentAt || null,
        };
      }),
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
        dueDate: payment.dueDate,
        isOverdue: payment.dueDate ? new Date() > payment.dueDate && (payment.status === 'PENDING' || payment.status === 'OVERDUE') : false,
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
      (p) => {
        if (p.status !== "PENDING" || !period.dueDate) return false;
        return new Date() > period.dueDate;
      }
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
        isOverdue: payment.period.dueDate ? new Date() > payment.period.dueDate && (payment.status === 'PENDING' || payment.status === 'OVERDUE') : false,
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

    // Generar recibo digital (sin pagos adicionales en este caso)
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
    const existing = await prisma.monthlyPayment.findUnique({
      where: { id: monthlyPaymentId },
      select: { notes: true },
    });
    const originalNotes = existing?.notes || '';
    const paymentNotes = isPartialPayment
      ? `Pago parcial: $${paidAmount.toLocaleString()} de $${(paidAmount + remainingAmount).toLocaleString()}. Pendiente: $${remainingAmount.toLocaleString()}`
      : `Pago completo: $${paidAmount.toLocaleString()}`;
    const notes = originalNotes
      ? `${originalNotes} | ${paymentNotes}`
      : paymentNotes;
    
    await prisma.monthlyPayment.update({
      where: { id: monthlyPaymentId },
      data: {
        status: paymentStatus,
        paidAmount: paidAmount,
        paymentDate: new Date(),
        approvedBy: reviewedBy,
        notes,
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
  private async createRemainingPayment(student: any, period: any, danceClass: any, remainingAmount: number, createdBy: string) {
    try {
      console.log("📋 Creando nuevo pago pendiente para saldo restante...");

      // Obtener la configuración de tarifa más reciente para el deporte de la clase
      const feeConfig = await prisma.monthlyFeeConfig.findFirst({
        where: { 
          isActive: true,
          sport: danceClass.sport
        },
        orderBy: { id: 'desc' },
      });

      if (!feeConfig) {
        throw new Error(`No hay configuración de mensualidad activa para ${danceClass.sport}`);
      }

      // Obtener el día de corte de la clase (necesitamos buscar la inscripción)
      const cutoffDay = await resolveCutoffDay(student.id, danceClass.id);

      // Calcular fecha de vencimiento basada en el día de corte de la clase
      const dueDate = this.calculateDueDate(
        cutoffDay, 
        { year: period.year, month: period.month }
      );

      const newPayment = await prisma.monthlyPayment.create({
        data: {
          studentId: student.id,
          classId: danceClass.id,
          periodId: period.id,
          feeConfigId: feeConfig.id,
          expectedAmount: remainingAmount,
          status: "PENDING",
          dueDate: dueDate,
          notes: `Saldo restante de pago parcial - ${period.name} - ${danceClass.name} (${danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol'}) (Corte día ${cutoffDay})`,
        },
      });

      console.log(`✅ Nuevo pago pendiente creado: ID ${newPayment.id} por $${remainingAmount.toLocaleString()} para clase ${danceClass.name}`);
    } catch (error) {
      console.error("❌ Error creando nuevo pago pendiente:", error);
      throw new Error("Error al crear nuevo pago pendiente");
    }
  }

  /**
   * Crea una deuda adicional manual
   */
  private async createAdditionalDebt(student: any, period: any, amount: number) {
    try {
      console.log("📋 Creando deuda adicional manual...");

      const debtConcept = `Adeudo adicional - ${period.name}`;
      
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
    reviewedBy: string,
    additionalPayments?: {
      type: string;
      amount: number;
      paymentMethod?: string;
    }[],
    correlationId?: string
  ) {
    try {
      console.log("📄 Generando recibo digital...");
      const receiptData = await DigitalReceiptService.createReceiptFromMonthlyPayment(
        monthlyPaymentId,
        paidAmount,
        paymentMethod,
        reviewedBy,
        additionalPayments,
        { correlationId: correlationId || `payment-${monthlyPaymentId}` }
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

      // Calcular fecha del próximo pago con día de corte de la clase específica (15 o 30)
      let cutoffDay = 30; // Default
      if (payment.classId) {
        cutoffDay = await resolveCutoffDay(student.id, payment.classId);
      }
      
      console.log(`🔍 Debug para notificación de pago recibido:`);
      console.log(`   - StudentId: ${student.id}`);
      console.log(`   - ClassId: ${payment.classId}`);
      console.log(`   - CutoffDay calculado: ${cutoffDay}`);
      
      const nextPaymentDate = await this.calculateNextPaymentDate(period, cutoffDay);

      // Generar URL del recibo
      const receiptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/recibo/${receiptData.id}`;

      // Calcular el período correcto para el concepto basado en el día de corte
      const periodInfo = calculatePaymentPeriodForConcept(
        cutoffDay, 
        period.year, 
        period.month
      );
      
      console.log(`🔍 Debug período en notificación de pago recibido:`);
      console.log(`   - CutoffDay: ${cutoffDay}`);
      console.log(`   - Period year: ${period.year}`);
      console.log(`   - Period month: ${period.month}`);
      console.log(`   - PeriodInfo calculado:`, periodInfo);
      console.log(`   - Period name original: ${period.name}`);
      console.log(`   - Period name corregido: ${periodInfo.periodName}`);

      const notificationData = {
        studentName: student.name,
        parentPhone: student.phone,
        period: periodInfo.periodName,
        amount: receivedAmount,
        paymentMethod: paymentMethodLabels[paymentMethod as keyof typeof paymentMethodLabels] || paymentMethod,
        receiptUrl,
        isPartialPayment,
        expectedAmount: payment.expectedAmount,
        remainingAmount: isPartialPayment ? remainingAmount : 0,
        paymentStatus: isPartialPayment ? "PARTIAL" : "COMPLETE",
        nextPaymentDate,
      };

      const result = await whatsappService.sendProofApprovedNotification(notificationData);
      
      // Verificar que el mensaje se haya enviado correctamente
      // Solo marcar como enviado si la respuesta es exitosa (sin errores y con ID de mensaje)
      const hasError = (result as any)?.error;
      const hasMessageId = (result as any)?.messages?.[0]?.id;
      
      if (result && !hasError && hasMessageId) {
        // Marcar como enviado el recibo solo si fue exitoso
        await prisma.monthlyPayment.update({
          where: { id: payment.id },
          data: {
            receiptSent: true,
            receiptSentAt: new Date()
          } as any // Temporal hasta que se regenere Prisma
        });
        console.log("✅ Notificación de pago recibido enviada exitosamente y marcada como enviada");
      } else {
        console.warn("⚠️ Respuesta de WhatsApp no confirma envío exitoso, no se marca como enviado");
        throw new Error('No se recibió confirmación válida de envío del recibo');
      }
    } catch (whatsappError) {
      console.error("❌ Error enviando notificación de pago recibido:", whatsappError);
      // No marcar como enviado si hay error
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

    // Calcular la fecha del próximo pago y el período correcto para el concepto
    let nextPaymentDate: string | undefined = undefined;
    let correctPeriodName: string = period.name; // Fallback al período original
    
    try {
      // Obtener el día de corte de la clase
      let cutoffDay = 30; // Default
      if (monthlyPayment.classId) {
        cutoffDay = await resolveCutoffDay(monthlyPayment.studentId, monthlyPayment.classId);
      }
      
      // Calcular el período correcto para el concepto basado en el día de corte
      const periodInfo = calculatePaymentPeriodForConcept(
        cutoffDay, 
        period.year, 
        period.month
      );
      correctPeriodName = periodInfo.periodName;
      console.log(`🔍 CorrectPeriodName asignado: ${correctPeriodName}`);
      
      console.log(`🔍 Debug período en notificación WhatsApp:`);
      console.log(`   - CutoffDay: ${cutoffDay}`);
      console.log(`   - Period year: ${period.year}`);
      console.log(`   - Period month: ${period.month}`);
      console.log(`   - PeriodInfo calculado:`, periodInfo);
      console.log(`   - CorrectPeriodName después de asignación: ${correctPeriodName}`);
      
      // Calcular el próximo pago: mes siguiente al período actual con el día de corte
      const currentPeriodDate = new Date(period.year, period.month - 1, 1);
      const nextPeriodDate = new Date(currentPeriodDate);
      nextPeriodDate.setMonth(nextPeriodDate.getMonth() + 1);
      const nextPaymentDateObj = new Date(nextPeriodDate.getFullYear(), nextPeriodDate.getMonth(), cutoffDay);
      nextPaymentDate = nextPaymentDateObj.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch (error) {
      console.error("❌ Error calculando próxima fecha de pago:", error);
    }

    const notificationData = {
      studentName: student.name,
      parentPhone: student.phone,
      period: correctPeriodName,
      amount: paidAmount,
      paymentMethod: paymentMethodLabels[proof.paymentMethod] || proof.paymentMethod,
      receiptUrl,
      isPartialPayment,
      expectedAmount: monthlyPayment.expectedAmount,
      remainingAmount: isPartialPayment ? remainingAmount : 0,
      paymentStatus: isPartialPayment ? "PARTIAL" : "COMPLETE",
      nextPaymentDate,
    };

    console.log(`🔍 Debug notificationData antes de enviar WhatsApp:`);
    console.log(`   - Period en notificationData: ${notificationData.period}`);
    console.log(`   - CorrectPeriodName: ${correctPeriodName}`);

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

  /**
   * Procesa un pago adicional (como inscripción) junto con el pago mensual
   */
  private async processAdditionalPayment(
    student: any,
    additionalPayment: {
      type: "ENROLLMENT";
      amount: number;
      paymentMethod?: "CASH" | "TRANSFER" | "CARD";
    },
    processedBy: string,
    classId: number
  ) {
    try {
      console.log(`🔄 Procesando pago adicional de tipo ${additionalPayment.type} por $${additionalPayment.amount.toLocaleString()}`);

      if (additionalPayment.type === "ENROLLMENT") {
        // Obtener el deporte de la clase
        const danceClass = await prisma.danceClass.findUnique({
          where: { id: classId },
          select: { sport: true }
        });

        if (!danceClass) {
          throw new Error("Clase no encontrada");
        }

        const sport = danceClass.sport as "DANCE" | "VOLLEYBALL";
        console.log(`🏃 Deporte determinado automáticamente: ${sport}`);

        // Permitir múltiples pagos de inscripción por deporte: siempre crear un nuevo registro
        const enrollmentPayment = await prisma.enrollmentPayment.create({
          data: {
            studentId: student.id,
            sport: sport,
            expectedAmount: additionalPayment.amount,
            status: "PAID",
            paidAt: new Date(),
            paymentMethod: additionalPayment.paymentMethod || null
          }
        });
        console.log(`✅ Pago de inscripción creado: ID ${enrollmentPayment.id} (${sport})`);

        // El recibo se generará junto con el pago mensual
      }
    } catch (error) {
      console.error("❌ Error procesando pago adicional:", error);
      throw new Error("Error al procesar pago adicional");
    }
  }

}

export const monthlyPaymentService = new MonthlyPaymentService();
