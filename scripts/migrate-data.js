const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function migrateData() {
  try {
    console.log('🚀 Iniciando migración de datos...')

    // 1. Crear entrenadores de ejemplo si no existen
    console.log('\n👨‍🏫 Verificando entrenadores...')
    const trainerCount = await prisma.trainer.count()
    
    if (trainerCount === 0) {
      const trainers = [
        {
          name: 'Carlos Rodríguez',
          email: 'carlos@academia.com',
          phone: '+1234567890'
        },
        {
          name: 'María González',
          email: 'maria@academia.com',
          phone: '+1234567891'
        },
        {
          name: 'Luis Martínez',
          email: 'luis@academia.com',
          phone: '+1234567892'
        }
      ]

      for (const trainer of trainers) {
        await prisma.trainer.create({ data: trainer })
        console.log(`   ✅ Entrenador creado: ${trainer.name}`)
      }
    } else {
      console.log(`   ℹ️  Ya existen ${trainerCount} entrenadores`)
    }

    // 2. Crear clases de ejemplo basadas en grupos existentes de estudiantes
    console.log('\n📚 Creando clases de ejemplo...')
    
    const trainers = await prisma.trainer.findMany()
    const classCount = await prisma.danceClass.count()
    
    if (classCount === 0) {
      const sampleClasses = [
        {
          name: 'Salsa Básica',
          description: 'Aprende los pasos fundamentales de la salsa',
          trainerId: trainers[0]?.id,
          capacity: 20,
          price: 50.00,
          schedules: [
            { dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }, // Lunes
            { dayOfWeek: 3, startTime: '18:00', endTime: '19:00' }  // Miércoles
          ]
        },
        {
          name: 'Bachata Intermedio',
          description: 'Perfecciona tu técnica de bachata',
          trainerId: trainers[1]?.id,
          capacity: 15,
          price: 60.00,
          schedules: [
            { dayOfWeek: 2, startTime: '19:00', endTime: '20:00' }, // Martes
            { dayOfWeek: 4, startTime: '19:00', endTime: '20:00' }  // Jueves
          ]
        },
        {
          name: 'Merengue y Reggaeton',
          description: 'Ritmos caribeños modernos',
          trainerId: trainers[2]?.id,
          capacity: 25,
          price: 45.00,
          schedules: [
            { dayOfWeek: 5, startTime: '20:00', endTime: '21:00' }, // Viernes
            { dayOfWeek: 6, startTime: '17:00', endTime: '18:00' }  // Sábado
          ]
        },
        {
          name: 'Danza Contemporánea',
          description: 'Expresión corporal y movimiento fluido',
          trainerId: trainers[0]?.id,
          capacity: 12,
          price: 70.00,
          schedules: [
            { dayOfWeek: 3, startTime: '20:00', endTime: '21:00' } // Miércoles
          ]
        }
      ]

      for (const classData of sampleClasses) {
        if (!classData.trainerId) continue
        
        const { schedules, ...classInfo } = classData
        
        const newClass = await prisma.danceClass.create({
          data: {
            ...classInfo,
            schedules: {
              create: schedules
            }
          }
        })
        
        console.log(`   ✅ Clase creada: ${newClass.name}`)
      }
    } else {
      console.log(`   ℹ️  Ya existen ${classCount} clases`)
    }

    // 3. Inscribir estudiantes existentes en clases aleatoriamente
    console.log('\n🎓 Inscribiendo estudiantes en clases...')
    
    const students = await prisma.student.findMany({ where: { isActive: true } })
    const classes = await prisma.danceClass.findMany({ where: { isActive: true } })
    
    if (students.length > 0 && classes.length > 0) {
      const enrollmentCount = await prisma.classEnrollment.count()
      
      if (enrollmentCount === 0) {
        for (const student of students) {
          // Inscribir cada estudiante en 1-2 clases aleatoriamente
          const numClassesToEnroll = Math.floor(Math.random() * 2) + 1
          const shuffledClasses = classes.sort(() => 0.5 - Math.random())
          const classesToEnroll = shuffledClasses.slice(0, numClassesToEnroll)
          
          for (const danceClass of classesToEnroll) {
            // Verificar capacidad
            const currentEnrollments = await prisma.classEnrollment.count({
              where: { classId: danceClass.id, isActive: true }
            })
            
            if (currentEnrollments < danceClass.capacity) {
              await prisma.classEnrollment.create({
                data: {
                  studentId: student.id,
                  classId: danceClass.id
                }
              })
              console.log(`   ✅ ${student.name} inscrito en ${danceClass.name}`)
            }
          }
        }
      } else {
        console.log(`   ℹ️  Ya existen ${enrollmentCount} inscripciones`)
      }
    }

    // 4. Generar algunas sesiones de muestra
    console.log('\n📅 Generando sesiones de muestra...')
    
    const sessionCount = await prisma.classSession.count()
    if (sessionCount === 0) {
      console.log('   ℹ️  Ejecuta el script generate-sessions.js para crear sesiones automáticamente')
    } else {
      console.log(`   ℹ️  Ya existen ${sessionCount} sesiones`)
    }

    // 5. Mostrar resumen
    console.log('\n📊 Resumen de migración:')
    
    const finalCounts = {
      trainers: await prisma.trainer.count(),
      classes: await prisma.danceClass.count(),
      students: await prisma.student.count(),
      enrollments: await prisma.classEnrollment.count(),
      sessions: await prisma.classSession.count(),
      attendances: await prisma.attendance.count()
    }
    
    console.log(`   👨‍🏫 Entrenadores: ${finalCounts.trainers}`)
    console.log(`   📚 Clases: ${finalCounts.classes}`)
    console.log(`   🎓 Estudiantes: ${finalCounts.students}`)
    console.log(`   📝 Inscripciones: ${finalCounts.enrollments}`)
    console.log(`   📅 Sesiones: ${finalCounts.sessions}`)
    console.log(`   ✅ Asistencias: ${finalCounts.attendances}`)

    console.log('\n🎉 ¡Migración completada exitosamente!')
    console.log('\n📋 Próximos pasos:')
    console.log('   1. Ejecuta: node scripts/generate-sessions.js')
    console.log('   2. Verifica las clases en el panel de administración')
    console.log('   3. Comienza a tomar asistencias por clase')

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar la migración
migrateData() 