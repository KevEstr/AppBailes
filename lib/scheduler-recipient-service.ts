import { prisma } from "@/lib/prisma";

type SchedulerType = 'MONTHLY_PAYMENT' | 'DEBT_REMINDER' | 'OVERDUE_WARNING' | 'PARTIAL_PAYMENT' | 'CUSTOM_MESSAGE';
type TargetFilter = 'ALL_ACTIVE' | 'WITH_DEBT' | 'OVERDUE_PAYMENTS' | 'PARTIAL_PAYMENTS' | 'SPECIFIC_STUDENTS' | 'CUSTOM_FILTER';

export class SchedulerRecipientService {
  /**
   * Obtiene recomendaciones de estudiantes basadas en el tipo de scheduler
   */
  async getRecommendations(schedulerType: SchedulerType) {
    switch (schedulerType) {
      case 'MONTHLY_PAYMENT':
        return await this.getMonthlyPaymentRecommendations();
      case 'DEBT_REMINDER':
        return await this.getDebtReminderRecommendations();
      case 'OVERDUE_WARNING':
        return await this.getOverdueWarningRecommendations();
      case 'PARTIAL_PAYMENT':
        return await this.getPartialPaymentRecommendations();
      default:
        return await this.getAllActiveStudents();
    }
  }

  /**
   * Recomendaciones para recordatorios de mensualidad
   */
  private async getMonthlyPaymentRecommendations() {
    const students = await prisma.student.findMany({
      where: { 
        isActive: true,
        phone: { not: null }
      },
      include: {
        monthlyPayments: {
          where: {
            status: 'PENDING',
            period: { isActive: true }
          },
          include: { period: true }
        }
      }
    });

    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      reason: student.monthlyPayments.length > 0 
        ? `Pendiente: ${student.monthlyPayments[0].period.name}`
        : 'Estudiante activo',
      priority: student.monthlyPayments.length > 0 ? 'HIGH' : 'MEDIUM'
    }));
  }

  /**
   * Recomendaciones para recordatorios de deudas
   */
  private async getDebtReminderRecommendations() {
    const students = await prisma.student.findMany({
      where: { 
        isActive: true,
        phone: { not: null },
        debts: {
          some: {
            isPaid: false,
            dueDate: { lte: new Date() }
          }
        }
      },
      include: {
        debts: {
          where: {
            isPaid: false
          }
        }
      }
    });

    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      reason: `Deuda pendiente: $${student.debts.reduce((sum: number, debt: any) => sum + debt.amount, 0).toLocaleString()}`,
      priority: 'HIGH'
    }));
  }

  /**
   * Recomendaciones para advertencias de pagos vencidos
   */
  private async getOverdueWarningRecommendations() {
    const students = await prisma.student.findMany({
      where: { 
        isActive: true,
        phone: { not: null },
        monthlyPayments: {
          some: {
            status: 'PENDING',
            period: {
              dueDate: { lt: new Date() }
            }
          }
        }
      },
      include: {
        monthlyPayments: {
          where: {
            status: 'PENDING',
            period: {
              dueDate: { lt: new Date() }
            }
          },
          include: { period: true }
        }
      }
    });

    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      reason: `Pago vencido: ${student.monthlyPayments[0].period.name}`,
      priority: 'URGENT'
    }));
  }

  /**
   * Recomendaciones para pagos parciales
   */
  private async getPartialPaymentRecommendations() {
    const students = await prisma.student.findMany({
      where: { 
        isActive: true,
        phone: { not: null },
        monthlyPayments: {
          some: {
            status: 'PARTIAL_PAID'
          }
        }
      },
      include: {
        monthlyPayments: {
          where: {
            status: 'PARTIAL_PAID'
          },
          include: { period: true }
        }
      }
    });

    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      reason: `Pago parcial: ${student.monthlyPayments[0].period.name}`,
      priority: 'MEDIUM'
    }));
  }

  /**
   * Obtiene todos los estudiantes activos
   */
  private async getAllActiveStudents() {
    const students = await prisma.student.findMany({
      where: { 
        isActive: true,
        phone: { not: null }
      }
    });

    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      reason: 'Estudiante activo',
      priority: 'LOW'
    }));
  }

  /**
   * Obtiene estudiantes basados en un filtro específico
   */
  async getStudentsByFilter(targetFilter: TargetFilter, customFilter?: string) {
    switch (targetFilter) {
      case 'ALL_ACTIVE':
        return await this.getAllActiveStudents();
      
      case 'WITH_DEBT':
        return await this.getStudentsWithDebt();
      
      case 'OVERDUE_PAYMENTS':
        return await this.getStudentsWithOverduePayments();
      
      case 'PARTIAL_PAYMENTS':
        return await this.getStudentsWithPartialPayments();
      
      case 'SPECIFIC_STUDENTS':
        return await this.getSpecificStudents(customFilter);
      
      case 'CUSTOM_FILTER':
        return await this.getStudentsByCustomFilter(customFilter);
      
      default:
        return await this.getAllActiveStudents();
    }
  }

  /**
   * Obtiene estudiantes con deuda
   */
  private async getStudentsWithDebt() {
    const students = await prisma.student.findMany({
      where: { 
        isActive: true,
        phone: { not: null },
        debts: {
          some: {
            isPaid: false
          }
        }
      },
      include: {
        debts: {
          where: { isPaid: false }
        }
      }
    });

    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      reason: `Deuda: $${student.debts.reduce((sum: number, debt: any) => sum + debt.amount, 0).toLocaleString()}`,
      priority: 'HIGH'
    }));
  }

  /**
   * Obtiene estudiantes con pagos vencidos
   */
  private async getStudentsWithOverduePayments() {
    const students = await prisma.student.findMany({
      where: { 
        isActive: true,
        phone: { not: null },
        monthlyPayments: {
          some: {
            status: 'PENDING',
            period: {
              dueDate: { lt: new Date() }
            }
          }
        }
      },
      include: {
        monthlyPayments: {
          where: {
            status: 'PENDING',
            period: {
              dueDate: { lt: new Date() }
            }
          },
          include: { period: true }
        }
      }
    });

    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      reason: `Vencido: ${student.monthlyPayments[0].period.name}`,
      priority: 'URGENT'
    }));
  }

  /**
   * Obtiene estudiantes con pagos parciales
   */
  private async getStudentsWithPartialPayments() {
    const students = await prisma.student.findMany({
      where: { 
        isActive: true,
        phone: { not: null },
        monthlyPayments: {
          some: {
            status: 'PARTIAL_PAID'
          }
        }
      },
      include: {
        monthlyPayments: {
          where: { status: 'PARTIAL_PAID' },
          include: { period: true }
        }
      }
    });

    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      phone: student.phone || '',
      reason: `Parcial: ${student.monthlyPayments[0].period.name}`,
      priority: 'MEDIUM'
    }));
  }

  /**
   * Obtiene estudiantes específicos por IDs
   */
  private async getSpecificStudents(customFilter?: string) {
    if (!customFilter) return [];

    try {
      const studentIds = JSON.parse(customFilter) as string[];
      
      const students = await prisma.student.findMany({
        where: { 
          id: { in: studentIds },
          isActive: true,
          phone: { not: null }
        }
      });

      return students.map(student => ({
        id: student.id,
        name: student.name,
        phone: student.phone,
        reason: 'Seleccionado manualmente',
        priority: 'MEDIUM'
      }));
    } catch (error) {
      console.error('Error parsing specific students filter:', error);
      return [];
    }
  }

  /**
   * Obtiene estudiantes por filtro personalizado
   */
  private async getStudentsByCustomFilter(customFilter?: string) {
    if (!customFilter) return await this.getAllActiveStudents();

    try {
      const filter = JSON.parse(customFilter);
      
      // Aquí puedes implementar lógica más compleja basada en el filtro
      // Por ahora, retornamos todos los activos
      return await this.getAllActiveStudents();
    } catch (error) {
      console.error('Error parsing custom filter:', error);
      return await this.getAllActiveStudents();
    }
  }

  /**
   * Agrega destinatarios a un scheduler
   */
  async addRecipients(schedulerId: number, studentIds: string[], addedBy?: string) {
    const recipients = [];

    for (const studentId of studentIds) {
      // Verificar si ya existe
      const existing = await prisma.schedulerRecipient.findUnique({
        where: {
          schedulerId_studentId: {
            schedulerId,
            studentId
          }
        }
      });

      if (!existing) {
        const recipient = await prisma.schedulerRecipient.create({
          data: {
            schedulerId,
            studentId,
            addedBy
          }
        });
        recipients.push(recipient);
      }
    }

    return recipients;
  }

  /**
   * Remueve destinatarios de un scheduler
   */
  async removeRecipients(schedulerId: number, studentIds: string[]) {
    const deleted = await prisma.schedulerRecipient.deleteMany({
      where: {
        schedulerId,
        studentId: { in: studentIds }
      }
    });

    return deleted.count;
  }

  /**
   * Obtiene todos los destinatarios de un scheduler
   */
  async getRecipients(schedulerId: number) {
    return await prisma.schedulerRecipient.findMany({
      where: { schedulerId },
      include: {
        student: true
      },
      orderBy: { student: { name: 'asc' } }
    });
  }

  /**
   * Actualiza el estado de un destinatario
   */
  async updateRecipientStatus(schedulerId: number, studentId: string, isActive: boolean) {
    return await prisma.schedulerRecipient.update({
      where: {
        schedulerId_studentId: {
          schedulerId,
          studentId
        }
      },
      data: { isActive }
    });
  }

  /**
   * Obtiene estadísticas de destinatarios
   */
  async getRecipientStats(schedulerId: number) {
    const recipients = await prisma.schedulerRecipient.findMany({
      where: { schedulerId },
      include: {
        student: true
      }
    });

    const total = recipients.length;
    const active = recipients.filter(r => r.isActive).length;
    const withPhone = recipients.filter(r => r.student.phone && r.student.phone.trim() !== '').length;

    return {
      total,
      active,
      withPhone,
      withoutPhone: total - withPhone
    };
  }
}

export const schedulerRecipientService = new SchedulerRecipientService(); 