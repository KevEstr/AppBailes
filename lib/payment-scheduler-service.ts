import { PrismaClient } from '@prisma/client';
import { whatsappService } from './whatsapp-service';

const prisma = new PrismaClient();

export class PaymentSchedulerService {
  private static instance: PaymentSchedulerService;
  private activeTimeouts: Map<number, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private loadedSchedulers: Set<number> = new Set();

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
    if (!scheduler.nextExecution) {
      console.log(`⚠️  Scheduler ${scheduler.name} no tiene próxima ejecución configurada`);
      return;
    }

    const now = new Date();
    const nextExecution = new Date(scheduler.nextExecution);
    const timeUntilExecution = nextExecution.getTime() - now.getTime();

    // Si ya pasó la hora, ejecutar inmediatamente
    if (timeUntilExecution <= 0) {
      console.log(`⚡ Ejecutando scheduler "${scheduler.name}" inmediatamente (hora pasada)`);
      this.executeScheduler(scheduler);
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
        
        // Obtener estudiantes activos
        const activeStudents = await prisma.student.findMany({
          where: { isActive: true }
        });
        
        console.log(`👥 Generando pagos para ${activeStudents.length} estudiantes activos`);
        
        for (const student of activeStudents) {
          await prisma.monthlyPayment.create({
            data: {
              studentId: student.id,
              periodId: activePeriod.id,
              feeConfigId: currentFeeConfig.id,
              expectedAmount: currentFeeConfig.amount,
              status: 'PENDING'
            }
          });
        }
        
        console.log(`✅ ${activeStudents.length} pagos mensuales generados`);
      } else {
        console.log(`✅ Ya existen ${existingPayments.length} pagos mensuales`);
      }

      // ========== PASO 3: GENERAR FORMULARIOS DE PAGO SI NO EXISTEN ==========
      console.log(`📋 Verificando formularios de pago para el período ${activePeriod.id}`);
      
      const existingForms = await prisma.paymentForm.findMany({
        where: { periodId: activePeriod.id }
      });
      
      if (existingForms.length === 0) {
        console.log(`🆕 Generando formularios de pago`);
        
        const monthlyPayments = await prisma.monthlyPayment.findMany({
          where: {
            periodId: activePeriod.id,
            status: 'PENDING'
          },
          include: {
            student: true
          }
        });
        
        for (const payment of monthlyPayments) {
          await prisma.paymentForm.create({
            data: {
              studentId: payment.studentId,
              periodId: activePeriod.id,
              monthlyPaymentId: payment.id,
              studentName: payment.student.name,
              amount: payment.expectedAmount,
              status: 'ACTIVE',
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
            }
          });
        }
        
        console.log(`✅ ${monthlyPayments.length} formularios de pago generados`);
      } else {
        console.log(`✅ Ya existen ${existingForms.length} formularios de pago`);
      }

      // ========== PASO 4: OBTENER DESTINATARIOS ESPECÍFICOS DEL SCHEDULER ==========
      console.log(`🎯 Obteniendo destinatarios específicos para el scheduler "${scheduler.name}"`);
      
      // Obtener todos los formularios de pago del período
      const allPaymentForms = await prisma.paymentForm.findMany({
        where: {
          periodId: activePeriod.id,
          status: 'ACTIVE'
        },
        include: {
          student: true,
          period: true
        }
      });

      if (!allPaymentForms || allPaymentForms.length === 0) {
        throw new Error('No se encontraron formularios de pago para enviar mensajes');
      }

      console.log(`📋 Encontrados ${allPaymentForms.length} formularios de pago totales`);

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

      // Filtrar formularios solo para los destinatarios del scheduler
      let formsToSend = allPaymentForms;
      
      if (schedulerRecipients.length > 0) {
        // Si hay destinatarios específicos, filtrar solo esos
        const recipientStudentIds = schedulerRecipients.map((r: any) => r.studentId);
        formsToSend = allPaymentForms.filter(form => 
          recipientStudentIds.includes(form.studentId)
        );
        console.log(`🎯 Filtrando solo destinatarios específicos: ${formsToSend.length} formularios`);
      } else {
        console.log(`⚠️  No hay destinatarios específicos configurados, usando todos los formularios`);
      }

      // Filtrar solo estudiantes activos con teléfono
      const formsWithPhone = formsToSend.filter((form: any) =>
        form.student.isActive && 
        form.student.phone && 
        form.student.phone.trim() !== ''
      );

      console.log(`📱 ${formsWithPhone.length} estudiantes con teléfono disponible para envío`);

      if (formsWithPhone.length === 0) {
        throw new Error('No hay estudiantes activos con teléfono configurado para enviar mensajes');
      }

      // ========== PASO 5: ENVIAR MENSAJES DE WHATSAPP ==========
      console.log(`📤 Iniciando envío de mensajes de WhatsApp...`);
      
      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

      // Enviar mensajes con intervalo y manejo de errores robusto
      for (let i = 0; i < formsWithPhone.length; i++) {
        const form = formsWithPhone[i];
        
        try {
          const paymentLink = `${baseUrl}/payment/${form.id}`;
          const dueDate = new Date(form.period.dueDate).toLocaleDateString('es-ES');
          
          const whatsappData = {
            studentName: form.student.name,
            parentPhone: form.student.phone,
            paymentLink: paymentLink,
            amount: form.amount,
            period: form.period.name,
            dueDate: dueDate
          };

          console.log(`📱 [${i + 1}/${formsWithPhone.length}] Enviando a ${form.student.name} (${form.student.phone})`);
          
          // Enviar mensaje con timeout
          await Promise.race([
            whatsappService.sendPaymentMessage(whatsappData),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout WhatsApp')), 30000)
            )
          ]);
          
          sentCount++;
          console.log(`✅ Enviado exitosamente a ${form.student.name}`);

          // Intervalo entre mensajes (solo si no es el último)
          if (i < formsWithPhone.length - 1) {
            console.log(`⏳ Esperando 2 segundos antes del siguiente envío...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (messageError) {
          const errorMsg = `Error enviando a ${form.student.name}: ${messageError instanceof Error ? messageError.message : 'Error desconocido'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          failedCount++;
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Marcar ejecución como completada
      await prisma.schedulerExecution.update({
        where: { id: execution.id },
        data: {
          status: 'COMPLETED',
          completedAt: endTime,
          totalMessages: formsWithPhone.length,
          sentMessages: sentCount,
          failedMessages: failedCount
          // executionLogs: JSON.stringify({
          //   targetPeriod: activePeriod.name,
          //   totalFormsAvailable: paymentForms.length,
          //   formsWithPhone: formsWithPhone.length,
          //   duration: `${duration}ms`,
          //   successRate: `${((sentCount / formsWithPhone.length) * 100).toFixed(1)}%`,
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
      console.log(`   📋 Formularios generados: ${existingForms.length === 0 ? 'Sí' : 'Ya existían'}`);
      console.log(`   📊 Mensajes procesados: ${formsWithPhone.length}`);
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
    const nextMonth = new Date(now);
    
    if (scheduler.dayOfMonth) {
      // Scheduler mensual recurrente
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(scheduler.dayOfMonth);
      nextMonth.setHours(scheduler.hour);
      nextMonth.setMinutes(scheduler.minute);
      nextMonth.setSeconds(0);
      nextMonth.setMilliseconds(0);
    } else {
      // Por defecto, próximo mes mismo día
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setHours(scheduler.hour);
      nextMonth.setMinutes(scheduler.minute);
      nextMonth.setSeconds(0);
      nextMonth.setMilliseconds(0);
    }

    return nextMonth;
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
   */
  async getSchedulers() {
    return await prisma.paymentScheduler.findMany({
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 5 // Últimas 5 ejecuciones
        }
      },
      orderBy: { createdAt: 'desc' }
    });
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
