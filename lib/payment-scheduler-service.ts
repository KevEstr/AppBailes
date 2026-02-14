import { prisma } from '@/lib/prisma';
import { whatsappService } from './whatsapp-service';
import { MonthlyPaymentService } from './monthly-payment-service';

export class PaymentSchedulerService {
  private static instance: PaymentSchedulerService;
  private readonly activeTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private readonly loadedSchedulers: Set<number> = new Set();

  private constructor() {}

  static getInstance(): PaymentSchedulerService {
    if (!PaymentSchedulerService.instance) {
      PaymentSchedulerService.instance = new PaymentSchedulerService();
    }
    return PaymentSchedulerService.instance;
  }

  /**
   * Inicia el scheduler automático
   */
  async start() {
    if (this.isRunning) {
      console.log('🕒 Scheduler ya está ejecutándose');
      return;
    }

    console.log('🚀 Iniciando Payment Scheduler...');
    this.isRunning = true;

    try {
      // Cargar y programar todos los schedulers activos
      await this.loadAndScheduleAll();
      console.log('✅ Scheduler iniciado exitosamente');
    } catch (error) {
      console.error('❌ Error iniciando scheduler:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Detiene el scheduler
   */
  stop() {
    // Cancelar todos los timeouts activos
    this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
    this.activeTimeouts.clear();
    this.loadedSchedulers.clear();
    
    this.isRunning = false;
    console.log('🛑 Payment Scheduler detenido');
  }



  /**
   * Carga todos los schedulers activos y los programa
   */
  private async loadAndScheduleAll() {
    const activeSchedulers = await prisma.paymentScheduler.findMany({
      where: { 
        isActive: true
      },
      orderBy: { nextExecution: 'asc' }
    });

    console.log(`📋 Cargados ${activeSchedulers.length} schedulers activos`);

    // Limpiar timeouts existentes
    this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
    this.activeTimeouts.clear();
    this.loadedSchedulers.clear();

    // Programar cada scheduler individualmente
    for (const scheduler of activeSchedulers) {
      this.scheduleSpecificExecution(scheduler);
      this.loadedSchedulers.add(scheduler.id);
    }

    console.log(`⚡ Sistema programado: ${this.activeTimeouts.size} timeouts activos`);
  }

  /**
   * Programa la ejecución específica de un scheduler
   */
  private scheduleSpecificExecution(scheduler: any) {
    const now = new Date();
    let nextExecution: Date;
    
    // Si no tiene próxima ejecución configurada, calcularla
    if (!scheduler.nextExecution) {
      nextExecution = this.calculateNextExecution(scheduler);
      // Actualizar en la base de datos
      prisma.paymentScheduler.update({
        where: { id: scheduler.id },
        data: { nextExecution }
      }).catch(err => console.error('Error actualizando nextExecution:', err));
    } else {
      nextExecution = new Date(scheduler.nextExecution);
    }

    const timeUntilExecution = nextExecution.getTime() - now.getTime();

    // Si ya pasó la hora, calcular la próxima ejecución válida (no ejecutar inmediatamente)
    if (timeUntilExecution <= 0) {
      console.log(`⏭️  Scheduler "${scheduler.name}" ya pasó su hora programada, calculando próxima ejecución...`);
      nextExecution = this.calculateNextExecution(scheduler);
      
      // Actualizar en la base de datos
      prisma.paymentScheduler.update({
        where: { id: scheduler.id },
        data: { nextExecution }
      }).catch(err => console.error('Error actualizando nextExecution:', err));
      
      // Recalcular tiempo hasta la nueva ejecución
      const newTimeUntilExecution = nextExecution.getTime() - now.getTime();
      
      if (newTimeUntilExecution <= 0) {
        console.log(`⚠️  Scheduler "${scheduler.name}" - próxima ejecución aún en el pasado, omitiendo`);
        return;
      }
      
      // Continuar con la programación de la nueva fecha
      const timeout = setTimeout(() => {
        console.log(`⏰ Ejecutando scheduler "${scheduler.name}" programado`);
        this.executeScheduler(scheduler);
      }, newTimeUntilExecution);

      this.activeTimeouts.set(scheduler.id, timeout);
      console.log(`📅 Scheduler "${scheduler.name}" reprogramado para: ${nextExecution.toLocaleString('es-ES')}`);
      return;
    }

    // JavaScript setTimeout tiene límite de ~24.8 días
    const MAX_TIMEOUT = 2147483647; // 2^31 - 1 milliseconds
    
    if (timeUntilExecution > MAX_TIMEOUT) {
      console.log(`⚠️  Scheduler "${scheduler.name}" programado para más de 24 días - usando máximo timeout`);
      // Programar para el máximo tiempo posible y recalcular después
      const timeout = setTimeout(() => {
        console.log(`🔄 Recalculando scheduler "${scheduler.name}" después de timeout máximo`);
        this.scheduleSpecificExecution(scheduler);
      }, MAX_TIMEOUT);
      
      this.activeTimeouts.set(scheduler.id, timeout);
      return;
    }

    const timeout = setTimeout(() => {
      console.log(`⏰ Ejecutando scheduler "${scheduler.name}" programado`);
      this.executeScheduler(scheduler);
    }, timeUntilExecution);

    this.activeTimeouts.set(scheduler.id, timeout);
    
    const executionDate = new Date(Date.now() + timeUntilExecution);
    console.log(`📅 Scheduler "${scheduler.name}" programado para: ${executionDate.toLocaleString('es-ES')}`);
  }

  /**
   * Recarga schedulers manualmente
   */
  async reloadSchedulers() {
    console.log('🔄 Recargando schedulers...');
    await this.loadAndScheduleAll();
    console.log('✅ Schedulers recargados exitosamente');
  }

  /**
   * Ejecuta un scheduler específico por ID (método público para cron jobs)
   */
  async executeSchedulerById(schedulerId: number) {
    const scheduler = await prisma.paymentScheduler.findUnique({
      where: { id: schedulerId }
    });

    if (!scheduler) {
      throw new Error(`Scheduler con ID ${schedulerId} no encontrado`);
    }

    if (!scheduler.isActive) {
      throw new Error(`Scheduler ${scheduler.name} no está activo`);
    }

    return await this.executeScheduler(scheduler);
  }

  /**
   * Ejecuta un scheduler específico - AUTOMATIZACIÓN COMPLETA
   */
  private async executeScheduler(scheduler: any) {
    let execution = null;
    const startTime = new Date();
    
    try {
      console.log(`🚀 Ejecutando scheduler: ${scheduler.name} - ${startTime.toISOString()}`);

      // Crear registro de ejecución
      execution = await prisma.schedulerExecution.create({
        data: {
          schedulerId: scheduler.id,
          status: 'RUNNING',
          startedAt: startTime,
        }
      });

      // ========== PASO 1: CREAR PERÍODO DEL MES SI NO EXISTE ==========
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      console.log(`📅 Verificando período para ${currentMonth}/${currentYear}`);
      
      let activePeriod = await prisma.paymentPeriod.findFirst({
        where: {
          year: currentYear,
          month: currentMonth,
          isActive: true
        }
      });

      if (!activePeriod) {
        console.log(`🆕 Creando nuevo período para ${currentMonth}/${currentYear}`);
        
        const monthNames = [
          "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
          "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];
        
        const periodName = `${monthNames[currentMonth - 1]} ${currentYear}`;
        const dueDate = new Date(currentYear, currentMonth - 1, 15); // Día 15 del mes
        
        activePeriod = await prisma.paymentPeriod.create({
          data: {
            year: currentYear,
            month: currentMonth,
            name: periodName,
            dueDate: dueDate,
            isActive: true
          }
        });
        
        console.log(`✅ Período creado: ${activePeriod.name} (ID: ${activePeriod.id})`);
      } else {
        console.log(`✅ Período existente: ${activePeriod.name} (ID: ${activePeriod.id})`);
      }

      // ========== PASO 2: GENERAR PAGOS MENSUALES SI NO EXISTEN ==========
      console.log(`💰 Verificando pagos mensuales para el período ${activePeriod.id}`);
      
      const existingPayments = await prisma.monthlyPayment.findMany({
        where: { periodId: activePeriod.id }
      });
      
      if (existingPayments.length === 0) {
        console.log(`🆕 Generando pagos mensuales para todos los estudiantes activos`);
        
        // Obtener configuración de mensualidad
        const currentFeeConfig = await prisma.monthlyFeeConfig.findFirst({
          where: { isActive: true },
          orderBy: { validFrom: 'desc' }
        });
        
        if (!currentFeeConfig) {
          throw new Error('No hay configuración de mensualidad activa. Configure el valor de la mensualidad primero.');
        }
        
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
        
        console.log(`👥 Generando pagos para ${activeStudents.length} estudiantes activos`);
        
        // Instanciar el servicio para usar la lógica diferenciada
        const monthlyPaymentService = new MonthlyPaymentService();
        
        for (const student of activeStudents) {
          // classId es obligatorio: usar la primera clase activa del estudiante
          const firstEnrollment = student.classEnrollments?.[0];
          if (!firstEnrollment) {
            console.warn(`⚠️ Estudiante ${student.id} sin clase activa; se omite crear pago para el período.`);
            continue;
          }
          const classId = firstEnrollment.classId;
          // Determinar el monto correcto para este estudiante (diferenciado por deporte)
          const studentAmount = await monthlyPaymentService.getStudentMonthlyFee(student, currentFeeConfig.amount);
          
          await prisma.monthlyPayment.create({
            data: {
              studentId: student.id,
              classId,
              periodId: activePeriod.id,
              feeConfigId: currentFeeConfig.id,
              expectedAmount: studentAmount,
              status: 'PENDING'
            }
          });
        }
        
        console.log(`✅ ${activeStudents.length} pagos mensuales generados`);
      } else {
        console.log(`✅ Ya existen ${existingPayments.length} pagos mensuales`);
      }

      // ========== PASO 3: OBTENER PAGOS PENDIENTES PARA ENVÍO DE WHATSAPP ==========
      console.log(`📋 Obteniendo pagos pendientes para el período ${activePeriod.id}`);
      
      const monthlyPayments = await prisma.monthlyPayment.findMany({
        where: {
          periodId: activePeriod.id,
          status: 'PENDING'
        },
        include: {
          student: {
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
          },
          period: true
        }
      });
      
      console.log(`✅ ${monthlyPayments.length} pagos pendientes encontrados`);

      // ========== PASO 4: OBTENER DESTINATARIOS ESPECÍFICOS DEL SCHEDULER ==========
      console.log(`🎯 Obteniendo destinatarios específicos para el scheduler "${scheduler.name}"`);

      if (!monthlyPayments || monthlyPayments.length === 0) {
        throw new Error('No se encontraron pagos pendientes para enviar mensajes');
      }

      console.log(`📋 Encontrados ${monthlyPayments.length} pagos pendientes totales`);

      // Obtener destinatarios específicos del scheduler
      const schedulerRecipients = await (prisma as any).schedulerRecipient.findMany({
        where: {
          schedulerId: scheduler.id,
          isActive: true
        },
        include: {
          student: true
        }
      });

      console.log(`👥 Destinatarios configurados en el scheduler: ${schedulerRecipients.length}`);

      // Filtrar pagos solo para los destinatarios del scheduler
      let paymentsToSend = monthlyPayments;
      
      if (schedulerRecipients.length > 0) {
        // Si hay destinatarios específicos, filtrar solo esos
        const recipientStudentIds = schedulerRecipients.map((r: any) => r.studentId);
        paymentsToSend = monthlyPayments.filter(payment => 
          recipientStudentIds.includes(payment.studentId)
        );
        console.log(`🎯 Filtrando solo destinatarios específicos: ${paymentsToSend.length} pagos`);
      } else {
        console.log(`⚠️  No hay destinatarios específicos configurados, usando todos los pagos`);
      }

      // Aplicar filtro por grupo de corte si fue configurado en customFilter
      try {
        const custom = scheduler.customFilter ? JSON.parse(scheduler.customFilter) : null;
        if (custom?.cutoffGroup === '15' || custom?.cutoffGroup === '30') {
          const wanted = parseInt(custom.cutoffGroup, 10);
          // Filtrar por día de corte de la clase específica
          const filteredPayments = [];
          for (const payment of paymentsToSend) {
            let cutoffDay = 30; // Default
            if (payment.classId) {
              const enrollment = await prisma.classEnrollment.findFirst({
                where: {
                  studentId: payment.studentId,
                  classId: payment.classId,
                  isActive: true
                },
                select: { paymentCutoffDay: true }
              });
              cutoffDay = enrollment?.paymentCutoffDay || 30;
            }
            
            if (cutoffDay === wanted) {
              filteredPayments.push(payment);
            }
          }
          paymentsToSend = filteredPayments;
          console.log(`🔎 Aplicando filtro de corte ${wanted}: ${paymentsToSend.length} pagos`);
        }
      } catch (e) {
        console.warn('⚠️ No se pudo parsear customFilter para cutoffGroup:', e);
      }

      // Filtrar solo estudiantes activos con teléfono disponible según mayoría de edad
      const paymentsWithPhone = paymentsToSend.filter((payment: any) => {
        const isMinor = payment.student.enrollmentData?.isAdult === false;
        const candidatePhone = isMinor
          ? (payment.student.enrollmentData?.emergencyContactPhone || '')
          : (payment.student.phone || '');
        return payment.student.isActive && candidatePhone.trim() !== '';
      });

      console.log(`📱 ${paymentsWithPhone.length} estudiantes con teléfono disponible para envío`);
      if (paymentsWithPhone.length === 0) {
        throw new Error('No hay estudiantes activos con teléfono configurado para enviar mensajes');
      }

      // ========== PASO 5: ENVÍO DE MENSAJES DESHABILITADO ==========
      // Los mensajes ya no se envían automáticamente
      // Los usuarios deben copiar el mensaje manualmente desde el botón "Ver Mensaje" en cada pago
      console.log(`⚠️  Envío de mensajes deshabilitado. Se encontraron ${paymentsWithPhone.length} pagos pendientes.`);
      
      let sentCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];

      // Código comentado - ya no se envían mensajes automáticamente
      // // Enviar mensajes con intervalo y manejo de errores robusto
      // for (let i = 0; i < paymentsWithPhone.length; i++) {
      //   const payment = paymentsWithPhone[i];
      //   
      //   try {
      //     // ========== VALIDACIÓN CRÍTICA: Verificar que el pago sigue pendiente ==========
      //     // Esto evita enviar mensajes a personas que ya pagaron entre el momento
      //     // en que se obtuvieron los pagos y el momento del envío
      //     const currentPaymentStatus = await prisma.monthlyPayment.findUnique({
      //       where: { id: payment.id },
      //       select: { status: true }
      //     });

      //     if (!currentPaymentStatus) {
      //       console.log(`⏭️  Pago ${payment.id} ya no existe, omitiendo envío a ${payment.student.name}`);
      //       skippedCount++;
      //       continue;
      //     }

      //     if (currentPaymentStatus.status !== 'PENDING') {
      //       console.log(`⏭️  Pago ${payment.id} ya fue ${currentPaymentStatus.status}, omitiendo envío a ${payment.student.name}`);
      //       skippedCount++;
      //       continue;
      //     }
      //     // ===============================================================================

      //     // Obtener el día de corte de la clase específica
      //     let cutoffDay = 30; // Default
      //     if (payment.classId) {
      //       const enrollment = await prisma.classEnrollment.findFirst({
      //         where: {
      //           studentId: payment.studentId,
      //           classId: payment.classId,
      //           isActive: true
      //         },
      //         select: { paymentCutoffDay: true }
      //       });
      //       cutoffDay = enrollment?.paymentCutoffDay || 30;
      //     }
      //     
      //     console.log(`🔍 Debug para scheduler pago ${payment.id}:`);
      //     console.log(`   - StudentId: ${payment.studentId}`);
      //     console.log(`   - ClassId: ${payment.classId}`);
      //     console.log(`   - CutoffDay calculado: ${cutoffDay}`);
      //     console.log(`   - Estado del pago: ${currentPaymentStatus.status} (verificado antes de enviar)`);
      //     
      //     // Calcular fecha de corte (15 o 30) para el mensaje
      //     const now = new Date();
      //     const due = new Date(now);
      //     // Si hoy ya pasó el corte de este mes, apuntar al próximo mes
      //     if (now.getDate() > cutoffDay) {
      //       due.setMonth(due.getMonth() + 1);
      //     }
      //     due.setDate(cutoffDay);
      //     const dueDate = due.toLocaleDateString('es-ES');
      //     
      //     // Determinar el deporte del estudiante (priorizar DANCE sobre VOLLEYBALL)
      //     const sports = payment.student.classEnrollments?.map((enrollment: any) => enrollment.danceClass.sport) || [];
      //     const primarySport = sports.includes('DANCE') ? 'DANCE' : (sports[0] || 'DANCE');
      //     
      //     const isMinor = payment.student.enrollmentData?.isAdult === false;
      //     const targetPhone = isMinor
      //       ? (payment.student.enrollmentData?.emergencyContactPhone || payment.student.phone)
      //       : payment.student.phone;

      //     const whatsappData = {
      //       studentName: payment.student.name,
      //       parentPhone: targetPhone,
      //       paymentLink: '',
      //       amount: payment.expectedAmount,
      //       period: payment.period.name,
      //       dueDate: dueDate,
      //       sport: primarySport,
      //       paymentId: payment.id, // Para referencia del pago pendiente
      //       cutoffDay
      //     };

      //     console.log(`📱 [${i + 1}/${paymentsWithPhone.length}] Enviando a ${payment.student.name} (${payment.student.phone})`);
      //     
      //     // Enviar template personalizado aprobado por Meta (usa cutoffDay)
      //     const formattedPhone = whatsappService.formatPhoneNumber(targetPhone);
      //     await Promise.race([
      //       whatsappService.sendCustomPaymentTemplate(whatsappData, formattedPhone),
      //       new Promise((_, reject) => 
      //         setTimeout(() => reject(new Error('Timeout WhatsApp')), 30000)
      //       )
      //     ]);
      //     
      //     sentCount++;
      //     console.log(`✅ Enviado exitosamente a ${payment.student.name}`);

      //     // Intervalo entre mensajes (solo si no es el último)
      //     if (i < paymentsWithPhone.length - 1) {
      //       console.log(`⏳ Esperando 2 segundos antes del siguiente envío...`);
      //       await new Promise(resolve => setTimeout(resolve, 2000));
      //     }
      //   } catch (messageError) {
      //     const errorMsg = `Error enviando a ${payment.student.name}: ${messageError instanceof Error ? messageError.message : 'Error desconocido'}`;
      //     console.error(`❌ ${errorMsg}`);
      //     errors.push(errorMsg);
      //     failedCount++;
      //   }
      // }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Marcar ejecución como completada
      await prisma.schedulerExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: endTime,
          totalMessages: paymentsWithPhone.length,
          sentMessages: sentCount,
          failedMessages: failedCount
          // executionLogs: JSON.stringify({
          //   targetPeriod: activePeriod.name,
          //   totalPaymentsAvailable: monthlyPayments.length,
          //   paymentsWithPhone: paymentsWithPhone.length,
          //   duration: `${duration}ms`,
          //   successRate: `${((sentCount / paymentsWithPhone.length) * 100).toFixed(1)}%`,
          //   details: `Enviados: ${sentCount}, Fallidos: ${failedCount}`,
          //   errors: errors.slice(0, 5) // Solo primeros 5 errores
          // })
        }
      });

      // Calcular próxima ejecución
      const nextExecution = this.calculateNextExecution(scheduler);
      
      // Actualizar estadísticas del scheduler
      await prisma.paymentScheduler.update({
        where: { id: scheduler.id },
        data: {
          lastExecuted: startTime,
          nextExecution,
          totalExecutions: { increment: 1 },
          totalSent: { increment: sentCount },
          totalFailed: { increment: failedCount }
        }
      });

      console.log(`🎉 AUTOMATIZACIÓN COMPLETA EXITOSA:`);
      console.log(`   📅 Período: ${activePeriod.name}`);
      console.log(`   💰 Pagos generados: ${existingPayments.length === 0 ? 'Sí' : 'Ya existían'}`);
      console.log(`   📋 Sistema: Pagos pendientes (sin formularios)`);
      console.log(`   📊 Pagos candidatos: ${paymentsWithPhone.length}`);
      console.log(`   ⏭️  Pagos omitidos (ya pagados): ${skippedCount}`);
      console.log(`   ✅ Mensajes enviados: ${sentCount}`);
      console.log(`   ❌ Mensajes fallidos: ${failedCount}`);
      console.log(`   ⏱️  Duración total: ${duration}ms`);
      console.log(`   📅 Próxima ejecución: ${nextExecution.toLocaleString('es-ES')}`);

      // Reprogramar para la próxima ejecución
      this.scheduleSpecificExecution({
        ...scheduler,
        nextExecution
      });

    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.error(`❌ Error ejecutando scheduler "${scheduler.name}":`, error);
      console.error(`⏱️  Duración hasta error: ${duration}ms`);
      
      if (execution) {
        await prisma.schedulerExecution.update({
          where: { id: execution.id },
          data: {
            status: 'FAILED',
            completedAt: endTime,
            errorMessage: error instanceof Error ? error.message : 'Error desconocido'
            // executionLogs: JSON.stringify({
            //   error: error instanceof Error ? error.message : 'Error desconocido',
            //   duration: `${duration}ms`,
            //   timestamp: endTime.toISOString()
            // })
          }
        });
      }

      // Actualizar estadísticas del scheduler
      await prisma.paymentScheduler.update({
        where: { id: scheduler.id },
        data: {
          totalFailed: { increment: 1 }
        }
      });

      // Intentar reprogramar para la próxima ejecución incluso si falló
      try {
        const nextExecution = this.calculateNextExecution(scheduler);
        this.scheduleSpecificExecution({
          ...scheduler,
          nextExecution
        });
        console.log(`🔄 Scheduler reprogramado para próxima ejecución`);
      } catch (reprogramError) {
        console.error(`❌ Error reprogramando scheduler:`, reprogramError);
      }
    }
  }

  /**
   * Calcula la próxima ejecución para schedulers recurrentes
   */
  private calculateNextExecution(scheduler: any): Date {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    if (scheduler.dayOfMonth) {
      // Scheduler mensual recurrente
      // Primero intentar este mes
      let targetDate = new Date(currentYear, currentMonth, scheduler.dayOfMonth, scheduler.hour, scheduler.minute, 0, 0);
      
      // Si ya pasó este mes (día pasado o mismo día pero hora/minuto pasados), programar para el próximo mes
      if (targetDate <= now) {
        // Calcular para el próximo mes
        let nextMonth = currentMonth + 1;
        let nextYear = currentYear;
        
        // Manejar cambio de año
        if (nextMonth > 11) {
          nextMonth = 0;
          nextYear = currentYear + 1;
        }
        
        targetDate = new Date(nextYear, nextMonth, scheduler.dayOfMonth, scheduler.hour, scheduler.minute, 0, 0);
        
        // Si el día no existe en el próximo mes (ej: 31 de febrero), ajustar al último día del mes
        if (targetDate.getDate() !== scheduler.dayOfMonth) {
          // Crear fecha del último día del mes siguiente
          const lastDayOfMonth = new Date(nextYear, nextMonth + 1, 0);
          targetDate = new Date(nextYear, nextMonth, lastDayOfMonth.getDate(), scheduler.hour, scheduler.minute, 0, 0);
        }
      }
      
      return targetDate;
    } else {
      // Por defecto, próximo mes mismo día
      const nextMonth = new Date(currentYear, currentMonth + 1, now.getDate(), scheduler.hour, scheduler.minute, 0, 0);
      return nextMonth;
    }
  }

  /**
   * Crea un nuevo scheduler - PROFESIONAL con destinatarios
   */
  async createScheduler(data: {
    name: string;
    description?: string;
    dayOfMonth: number;
    hour: number;
    minute: number;
    schedulerType?: string;
    targetFilter?: string;
    customFilter?: string;
    createdBy?: string;
  }) {
    try {
      // Calcular próxima ejecución
      const nextExecution = this.calculateNextExecutionForNew(data);

      const scheduler = await (prisma as any).paymentScheduler.create({
        data: {
          name: data.name,
          description: data.description,
          dayOfMonth: data.dayOfMonth,
          hour: data.hour,
          minute: data.minute,
          schedulerType: data.schedulerType || 'MONTHLY_PAYMENT',
          targetFilter: data.targetFilter || 'ALL_ACTIVE',
          customFilter: data.customFilter,
          createdBy: data.createdBy,
          nextExecution,
          isActive: true
        }
      });

      console.log(`✅ Scheduler creado: ${scheduler.name}`);
      console.log(`⏰ Próxima ejecución: ${nextExecution.toLocaleString('es-ES')}`);
      console.log(`🎯 Tipo: ${(scheduler as any).schedulerType}, Filtro: ${(scheduler as any).targetFilter}`);

      // Si el sistema está activo, programar inmediatamente sin recargar todo
      if (this.isRunning && !this.loadedSchedulers.has(scheduler.id)) {
        this.scheduleSpecificExecution(scheduler);
        this.loadedSchedulers.add(scheduler.id);
        console.log('🎯 Scheduler programado inmediatamente - sin reinicio del sistema');
      }

      return scheduler;
    } catch (error) {
      console.error('❌ Error creando scheduler:', error);
      throw new Error('No se pudo crear el scheduler. Verifica que la base de datos esté configurada correctamente.');
    }
  }

  /**
   * Actualiza un scheduler - OPTIMIZADO
   */
  async updateScheduler(id: number, data: any) {
    const updates: any = { ...data };
    
    // Recalcular próxima ejecución si cambió la programación
    if (data.hour !== undefined || data.minute !== undefined || data.dayOfMonth !== undefined) {
      const scheduler = await prisma.paymentScheduler.findUnique({ where: { id } });
      if (scheduler) {
        updates.nextExecution = this.calculateNextExecutionForNew({
          ...scheduler,
          ...data
        });
      }
    }

    const updatedScheduler = await prisma.paymentScheduler.update({
      where: { id },
      data: updates,
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    // Gestión optimizada de timeout
    if (this.isRunning) {
      // Cancelar timeout anterior si existe
      if (this.activeTimeouts.has(id)) {
        clearTimeout(this.activeTimeouts.get(id)!);
        this.activeTimeouts.delete(id);
      }

      // Reprogramar solo si está activo y tiene próxima ejecución
      if (updatedScheduler.isActive && updatedScheduler.nextExecution) {
        this.scheduleSpecificExecution(updatedScheduler);
        this.loadedSchedulers.add(updatedScheduler.id);
        console.log(`🔄 Scheduler "${updatedScheduler.name}" reprogramado instantáneamente`);
      } else {
        this.loadedSchedulers.delete(id);
        console.log(`⏸️ Scheduler "${updatedScheduler.name}" desactivado`);
      }
    }

    return updatedScheduler;
  }

  /**
   * Elimina un scheduler
   */
  async deleteScheduler(id: number) {
    // Cancelar timeout si existe
    if (this.activeTimeouts.has(id)) {
      clearTimeout(this.activeTimeouts.get(id)!);
      this.activeTimeouts.delete(id);
    }

    return await prisma.paymentScheduler.delete({
      where: { id }
    });
  }

  /**
   * Obtiene todos los schedulers
   * Recalcula nextExecution si está desactualizado o es incorrecto
   */
  async getSchedulers() {
    const schedulers = await prisma.paymentScheduler.findMany({
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Últimas 5 ejecuciones
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Recalcular nextExecution para cada scheduler si está desactualizado
    const now = new Date();
    const updates: Array<{ id: number; nextExecution: Date }> = [];

    for (const scheduler of schedulers) {
      if (scheduler.isActive && scheduler.dayOfMonth) {
        // Calcular la próxima ejecución correcta
        const correctNextExecution = this.calculateNextExecution(scheduler);
        
        // Si no tiene nextExecution o está incorrecto, actualizarlo
        if (!scheduler.nextExecution || 
            new Date(scheduler.nextExecution).getTime() !== correctNextExecution.getTime()) {
          updates.push({
            id: scheduler.id,
            nextExecution: correctNextExecution
          });
        }
      }
    }

    // Actualizar en batch si hay cambios
    if (updates.length > 0) {
      await Promise.all(
        updates.map(update =>
          prisma.paymentScheduler.update({
            where: { id: update.id },
            data: { nextExecution: update.nextExecution }
          })
        )
      );
      console.log(`🔄 Actualizados ${updates.length} schedulers con nextExecution correcto`);
      
      // Recargar los schedulers con los valores actualizados
      return await prisma.paymentScheduler.findMany({
        include: {
          executions: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return schedulers;
  }

  /**
   * Calcula próxima ejecución para un nuevo scheduler
   */
  private calculateNextExecutionForNew(data: any): Date {
    const now = new Date();
    const nextExecution = new Date();

    if (data.isRecurring && data.dayOfMonth) {
      // Scheduler mensual recurrente
      const targetDate = new Date(now.getFullYear(), now.getMonth(), data.dayOfMonth, data.hour, data.minute, 0, 0);
      
      // Si ya pasó este mes, programar para el próximo
      if (targetDate <= now) {
        targetDate.setMonth(targetDate.getMonth() + 1);
      }
      
      return targetDate;
    } else {
      // Programar para hoy si aún no ha pasado la hora, sino mañana
      const todayTarget = new Date(now.getFullYear(), now.getMonth(), now.getDate(), data.hour, data.minute, 0, 0);
      
      if (todayTarget > now) {
        return todayTarget;
      } else {
        todayTarget.setDate(todayTarget.getDate() + 1);
        return todayTarget;
      }
    }
  }

  /**
   * Elimina un scheduler - OPTIMIZADO
   */

  /**
   * Obtiene el estado actual del scheduler - MEJORADO
   */
  getStatus() {
    const schedulerDetails = Array.from(this.activeTimeouts.entries()).map(([id, timeout]) => ({
      schedulerId: id,
      isActive: true,
      timeoutSet: true
    }));

    return {
      isRunning: this.isRunning,
      activeSchedulers: this.activeTimeouts.size,
      loadedSchedulers: this.loadedSchedulers.size,
      schedulerDetails,
      systemType: 'Ultra Optimized - Event Driven',
      noPolling: true,
      resourceUsage: 'Minimal - Only active timeouts',
      precision: 'Millisecond precision timing'
    };
  }

  /**
   * Método para diagnóstico y monitoreo
   */
  getDiagnostics() {
    const memoryUsage = process.memoryUsage();
    
    return {
      schedulerService: {
        isRunning: this.isRunning,
        activeTimeouts: this.activeTimeouts.size,
        loadedSchedulers: this.loadedSchedulers.size,
        memoryFootprint: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      systemOptimizations: {
        noPeriodicPolling: true,
        eventDrivenExecution: true,
        instantReprogramming: true,
        minimalDatabaseQueries: true,
        precisionTiming: 'Millisecond level'
      },
      performance: {
        startup: 'Single query + timeout programming',
        runtime: 'Zero database polling',
        updates: 'Instant timeout reprogramming',
        shutdown: 'Immediate timeout cancellation'
      }
    };
  }
}

export const paymentSchedulerService = PaymentSchedulerService.getInstance();
