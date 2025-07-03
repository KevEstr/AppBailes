const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// 🕐 FUNCIÓN AUXILIAR: Detectar conflictos de horario (igual que en la API)
function hasTimeConflict(schedule1, schedule2) {
  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const start1 = timeToMinutes(schedule1.startTime)
  const end1 = timeToMinutes(schedule1.endTime)
  const start2 = timeToMinutes(schedule2.startTime)
  const end2 = timeToMinutes(schedule2.endTime)

  return (start1 < end2 && end1 > start2)
}

async function testScheduleConflicts() {
  try {
    console.log('🧪 PROBANDO DETECCIÓN DE CONFLICTOS DE HORARIOS')
    console.log('=' .repeat(50))

    // Test 1: Horarios que NO se traslapan
    console.log('\n✅ Test 1: Horarios sin conflicto')
    const schedule1 = { startTime: '18:00', endTime: '19:30' }
    const schedule2 = { startTime: '20:00', endTime: '21:30' }
    console.log(`Horario 1: ${schedule1.startTime} - ${schedule1.endTime}`)
    console.log(`Horario 2: ${schedule2.startTime} - ${schedule2.endTime}`)
    console.log(`¿Conflicto?: ${hasTimeConflict(schedule1, schedule2) ? '❌ SÍ' : '✅ NO'}`)

    // Test 2: Horarios que SÍ se traslapan
    console.log('\n❌ Test 2: Horarios con conflicto (traslape)')
    const schedule3 = { startTime: '18:00', endTime: '19:30' }
    const schedule4 = { startTime: '19:00', endTime: '20:30' }
    console.log(`Horario 1: ${schedule3.startTime} - ${schedule3.endTime}`)
    console.log(`Horario 2: ${schedule4.startTime} - ${schedule4.endTime}`)
    console.log(`¿Conflicto?: ${hasTimeConflict(schedule3, schedule4) ? '❌ SÍ' : '✅ NO'}`)

    // Test 3: Horario contenido dentro de otro
    console.log('\n❌ Test 3: Horario contenido en otro')
    const schedule5 = { startTime: '18:00', endTime: '20:00' }
    const schedule6 = { startTime: '18:30', endTime: '19:30' }
    console.log(`Horario 1: ${schedule5.startTime} - ${schedule5.endTime}`)
    console.log(`Horario 2: ${schedule6.startTime} - ${schedule6.endTime}`)
    console.log(`¿Conflicto?: ${hasTimeConflict(schedule5, schedule6) ? '❌ SÍ' : '✅ NO'}`)

    // Test 4: Horarios idénticos
    console.log('\n❌ Test 4: Horarios idénticos')
    const schedule7 = { startTime: '18:00', endTime: '19:30' }
    const schedule8 = { startTime: '18:00', endTime: '19:30' }
    console.log(`Horario 1: ${schedule7.startTime} - ${schedule7.endTime}`)
    console.log(`Horario 2: ${schedule8.startTime} - ${schedule8.endTime}`)
    console.log(`¿Conflicto?: ${hasTimeConflict(schedule7, schedule8) ? '❌ SÍ' : '✅ NO'}`)

    // Test 5: Revisar conflictos reales en la base de datos
    console.log('\n🗄️  Test 5: Revisando conflictos existentes en la BD')
    const classes = await prisma.danceClass.findMany({
      where: { isActive: true },
      include: {
        trainer: { select: { id: true, name: true } },
        schedules: { where: { isActive: true } }
      }
    })

    console.log(`📚 Encontradas ${classes.length} clases activas`)

    const trainerConflicts = new Map()

    for (const danceClass of classes) {
      for (const schedule of danceClass.schedules) {
        const key = `${danceClass.trainerId}-${schedule.dayOfWeek}`
        
        if (!trainerConflicts.has(key)) {
          trainerConflicts.set(key, [])
        }
        
        trainerConflicts.get(key).push({
          className: danceClass.name,
          trainerName: danceClass.trainer.name,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        })
      }
    }

    // Detectar conflictos
    let conflictsFound = 0
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    for (const [key, schedules] of trainerConflicts) {
      if (schedules.length > 1) {
        console.log(`\n⚠️  Entrenador: ${schedules[0].trainerName} - ${dayNames[schedules[0].dayOfWeek]}`)
        
        for (let i = 0; i < schedules.length; i++) {
          for (let j = i + 1; j < schedules.length; j++) {
            if (hasTimeConflict(schedules[i], schedules[j])) {
              conflictsFound++
              console.log(`   ❌ CONFLICTO DETECTADO:`)
              console.log(`      • ${schedules[i].className}: ${schedules[i].startTime}-${schedules[i].endTime}`)
              console.log(`      • ${schedules[j].className}: ${schedules[j].startTime}-${schedules[j].endTime}`)
            } else {
              console.log(`   ✅ Sin conflicto:`)
              console.log(`      • ${schedules[i].className}: ${schedules[i].startTime}-${schedules[i].endTime}`)
              console.log(`      • ${schedules[j].className}: ${schedules[j].startTime}-${schedules[j].endTime}`)
            }
          }
        }
      }
    }

    console.log('\n' + '=' .repeat(50))
    console.log(`📊 RESUMEN: ${conflictsFound} conflictos encontrados en la base de datos`)
    console.log('✅ Pruebas de validación completadas')

  } catch (error) {
    console.error('❌ Error ejecutando pruebas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testScheduleConflicts() 