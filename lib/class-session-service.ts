import { PrismaClient } from '@prisma/client'

interface ClassSchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
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
        console.log(`⏰ Procesando horario: ${this.getDayName(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}`)
        
        // Encontrar todas las fechas que coinciden con este día de la semana
        const sessionDates = this.getSessionDates(schedule.dayOfWeek, startDate, endDate)
        
        console.log(`📅 Se generarán ${sessionDates.length} sesiones`)
        
        // Crear sesiones
        for (const sessionDate of sessionDates) {
          // Verificar si ya existe una sesión para esta fecha
          const existingSession = await this.prisma.classSession.findFirst({
            where: {
              classId: classId,
              date: {
                gte: this.getStartOfDay(sessionDate),
                lt: this.getEndOfDay(sessionDate)
              }
            }
          })
          
          if (existingSession) {
            console.log(`⚠️  Sesión ya existe para ${sessionDate.toDateString()}`)
            continue
          }
          
          // Crear fechas y horas completas
          const startDateTime = new Date(sessionDate)
          const [startHour, startMinute] = schedule.startTime.split(':')
          startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
          
          const endDateTime = new Date(sessionDate)
          const [endHour, endMinute] = schedule.endTime.split(':')
          endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
          
          await this.prisma.classSession.create({
            data: {
              classId: classId,
              date: sessionDate,
              startTime: startDateTime,
              endTime: endDateTime,
              status: 'SCHEDULED'
            }
          })
          
          totalSessions++
          console.log(`✅ Sesión creada para ${sessionDate.toDateString()}`)
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