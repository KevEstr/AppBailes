const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function generateSessions() {
  try {
    console.log('🚀 Generando sesiones de clases...')

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

    // Generar sesiones para las próximas 4 semanas
    const today = new Date()
    const endDate = new Date()
    endDate.setDate(today.getDate() + 28) // 4 semanas

    let totalSessions = 0

    for (const danceClass of classes) {
      console.log(`\n📝 Procesando clase: ${danceClass.name}`)
      
      for (const schedule of danceClass.schedules) {
        console.log(`   ⏰ Horario: ${getDayName(schedule.dayOfWeek)} ${schedule.startTime}-${schedule.endTime}`)
        
        // Encontrar todas las fechas que coinciden con este día de la semana
        const sessionDates = []
        let currentDate = new Date(today)
        
        // Ajustar al próximo día que coincida con el horario
        while (currentDate.getDay() !== schedule.dayOfWeek) {
          currentDate.setDate(currentDate.getDate() + 1)
        }
        
        // Generar fechas hasta el final del período
        while (currentDate <= endDate) {
          sessionDates.push(new Date(currentDate))
          currentDate.setDate(currentDate.getDate() + 7) // Siguiente semana
        }
        
        console.log(`   📅 Se generarán ${sessionDates.length} sesiones`)
        
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
    
    console.log(`\n🎉 ¡Completado! Se generaron ${totalSessions} nuevas sesiones`)
    
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
generateSessions() 