import { PrismaClient, SessionStatus } from '@prisma/client'

interface ClassSchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
  isActive: boolean
}

interface GenerateSessionsParams {
  classId: number
  schedules: ClassSchedule[]
  startDate?: Date
  weeksToGenerate?: number
}

export class ClassSessionService {
  constructor(private prisma: PrismaClient) {}

  async generateSessionsForClass({ 
    classId, 
    schedules, 
    startDate = new Date(),
    weeksToGenerate = 8 
  }: GenerateSessionsParams) {
    try {
      console.log(`🚀 Generando sesiones para clase ID: ${classId}`)
      
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + (weeksToGenerate * 7))

      let totalSessions = 0

      for (const schedule of schedules) {
        if (!schedule.isActive) {
          console.log(`⏭️ Saltando horario inactivo: ${this.getDayName(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}`)
          continue
        }

        console.log(`⏰ Procesando horario: ${this.getDayName(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}`)
        
        // Encontrar todas las fechas que coinciden con este día de la semana
        const sessionDates = this.getSessionDates(schedule.dayOfWeek, startDate, endDate)
        
        console.log(`📅 Se generarán ${sessionDates.length} sesiones`)
        
        // Crear sesiones
        for (const sessionDate of sessionDates) {
          const [startHour, startMinute] = schedule.startTime.split(':').map(Number)
          const [endHour, endMinute] = schedule.endTime.split(':').map(Number)
          
          const startDateTime = new Date(sessionDate)
          startDateTime.setHours(startHour, startMinute, 0, 0)
          
          const endDateTime = new Date(sessionDate)
          endDateTime.setHours(endHour, endMinute, 0, 0)
          
          // Ajustar la fecha de fin si la clase cruza medianoche
          if (endHour < startHour) {
            endDateTime.setDate(endDateTime.getDate() + 1)
          }

          // Determinar el estado inicial de la sesión
          const now = new Date()
          let initialStatus: SessionStatus = 'SCHEDULED'

          // Si la sesión ya debería haber comenzado
          if (startDateTime <= now && now <= endDateTime) {
            initialStatus = 'IN_PROGRESS'
          } 
          // Si la sesión ya debería haber terminado
          else if (now > endDateTime) {
            initialStatus = 'COMPLETED'
          }
          
          // Buscar sesiones existentes considerando el cruce de medianoche
          const existingSession = await this.prisma.classSession.findFirst({
            where: {
              classId: classId,
              AND: [
                {
                  startTime: {
                    gte: this.getStartOfDay(startDateTime),
                    lt: this.getEndOfDay(endDateTime)
                  }
                },
                {
                  OR: [
                    { startTime: startDateTime },
                    {
                      AND: [
                        { startTime: { lte: startDateTime } },
                        { endTime: { gte: endDateTime } }
                      ]
                    }
                  ]
                }
              ]
            }
          })
          
          if (existingSession) {
            console.log(`⚠️  Sesión ya existe para ${sessionDate.toDateString()} ${schedule.startTime}-${schedule.endTime}`)
            continue
          }
          
          const newSession = await this.prisma.classSession.create({
            data: {
              classId: classId,
              date: sessionDate,
              startTime: startDateTime,
              endTime: endDateTime,
              status: initialStatus
            }
          })
          
          totalSessions++
          console.log(`✅ Sesión creada para ${sessionDate.toDateString()} ${schedule.startTime}-${schedule.endTime} (Estado: ${initialStatus})`)
        }
      }
      
      console.log(`🎉 Completado! Se generaron ${totalSessions} nuevas sesiones`)
      return { success: true, totalSessions }
      
    } catch (error) {
      console.error('❌ Error generando sesiones:', error)
      throw error
    }
  }

  private getSessionDates(dayOfWeek: number, startDate: Date, endDate: Date): Date[] {
    const sessionDates: Date[] = []
    let currentDate = new Date(startDate)
    
    // Ajustar al próximo día que coincida con el horario
    while (currentDate.getDay() !== dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Generar fechas hasta el final del período
    while (currentDate <= endDate) {
      sessionDates.push(new Date(currentDate))
      currentDate.setDate(currentDate.getDate() + 7) // Siguiente semana
    }
    
    return sessionDates
  }

  private getStartOfDay(date: Date): Date {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    return start
  }

  private getEndOfDay(date: Date): Date {
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    return end
  }

  private getDayName(dayOfWeek: number): string {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
    return days[dayOfWeek] || 'Desconocido'
  }
} 