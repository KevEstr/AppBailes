const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function generateSessionsEnhanced() {
  try {
    console.log('🚀 Generando sesiones con períodos de fecha...')

    // Obtener todas las clases activas con sus horarios
    const classes = await prisma.danceClass.findMany({
      where: { isActive: true },
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    })

    console.log(`📚 Encontradas ${classes.length} clases activas`)

    // Fecha límite para generar sesiones (próximas 8 semanas)
    const today = new Date()
    const maxDate = new Date()
    maxDate.setDate(today.getDate() + 56) // 8 semanas

    let totalSessions = 0

    for (const danceClass of classes) {
      console.log(`\n📝 Procesando clase: ${danceClass.name}`)
      
      for (const schedule of danceClass.schedules) {
        console.log(`   ⏰ Horario: ${getDayName(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}`)
        
        // 🆕 VALIDAR FECHAS DE PERÍODO
        let periodStart = schedule.startDate ? new Date(schedule.startDate) : today
        let periodEnd = schedule.endDate ? new Date(schedule.endDate) : maxDate
        
        // Asegurar que no generemos sesiones fuera del período
        const generationStart = new Date(Math.max(today.getTime(), periodStart.getTime()))
        const generationEnd = new Date(Math.min(maxDate.getTime(), periodEnd.getTime()))
        
        console.log(`   📅 Período: ${periodStart.toDateString()} → ${periodEnd.toDateString()}`)
        
        // Si el período ya terminó, saltar
        if (generationEnd <= generationStart) {
          console.log(`   ⚠️  Período expirado o no válido`)
          continue
        }
        
        // Encontrar todas las fechas que coinciden con este día de la semana
        const sessionDates = []
        let currentDate = new Date(generationStart)
        
        // Ajustar al próximo día que coincida con el horario
        while (currentDate.getDay() !== schedule.dayOfWeek && currentDate <= generationEnd) {
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        // Generar fechas hasta el final del período
        while (currentDate <= generationEnd) {
          sessionDates.push(new Date(currentDate))
          currentDate.setDate(currentDate.getDate() + 7) // Siguiente semana
        }
        
        console.log(`   📅 Se generarán ${sessionDates.length} sesiones en el período`)
        
        // Crear sesiones
        for (const sessionDate of sessionDates) {
          // Verificar si ya existe una sesión para esta fecha
          const existingSession = await prisma.classSession.findFirst({
            where: {
              classId: danceClass.id,
              date: {
                gte: getStartOfDay(sessionDate),
                lt: getEndOfDay(sessionDate)
              }
            }
          })
          
          if (existingSession) {
            console.log(`     ⚠️  Sesión ya existe para ${sessionDate.toDateString()}`)
            continue
          }
          
          // Crear fechas y horas completas
          const startDateTime = new Date(sessionDate)
          const [startHour, startMinute] = schedule.startTime.split(':')
          startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)
          
          const endDateTime = new Date(sessionDate)
          const [endHour, endMinute] = schedule.endTime.split(':')
          endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
          
          await prisma.classSession.create({
            data: {
              classId: danceClass.id,
              date: sessionDate,
              startTime: startDateTime,
              endTime: endDateTime,
              status: 'SCHEDULED'
            }
          })
          
          totalSessions++
          console.log(`     ✅ Sesión creada para ${sessionDate.toDateString()}`)
        }
      }
    }
    
    console.log(`\n🎉 ¡Completado! Se generaron ${totalSessions} nuevas sesiones respetando períodos`)
    
  } catch (error) {
    console.error('❌ Error generando sesiones:', error)
  } finally {
    await prisma.$disconnect()
  }
}

function getDayName(dayOfWeek) {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return days[dayOfWeek]
}

function getStartOfDay(date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

function getEndOfDay(date) {
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)
  return end
}

// Ejecutar el script
generateSessionsEnhanced() 