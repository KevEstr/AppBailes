const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createSampleClasses() {
  try {
    console.log('🗓️ Creando clases de ejemplo...')

    // Obtener entrenadores existentes
    const trainers = await prisma.trainer.findMany()
    
    if (trainers.length === 0) {
      console.log('❌ No hay entrenadores disponibles. Ejecuta primero el seed.')
      return
    }

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const sampleClasses = [
      {
        name: 'Salsa Principiantes - Lunes',
        group: 'Salsa Principiantes',
        trainerId: trainers[0].id,
        date: today,
        startTime: new Date(today.setHours(18, 0, 0, 0)),
        endTime: new Date(today.setHours(19, 30, 0, 0)),
        notes: 'Clase de introducción a la salsa'
      },
      {
        name: 'Bachata Intermedio - Martes',
        group: 'Bachata Intermedio',
        trainerId: trainers.length > 1 ? trainers[1].id : trainers[0].id,
        date: tomorrow,
        startTime: new Date(tomorrow.setHours(19, 0, 0, 0)),
        endTime: new Date(tomorrow.setHours(20, 30, 0, 0)),
        notes: 'Clase de bachata nivel intermedio'
      },
      {
        name: 'Salsa Avanzado - Miércoles',
        group: 'Salsa Avanzado',
        trainerId: trainers[0].id,
        date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),
        startTime: new Date(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).setHours(20, 0, 0, 0)),
        endTime: new Date(new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).setHours(21, 30, 0, 0)),
        notes: 'Clase avanzada de salsa con figuras complejas'
      }
    ]

    for (const classData of sampleClasses) {
      const existingClass = await prisma.class.findFirst({
        where: { 
          name: classData.name,
          date: classData.date
        }
      })

      if (!existingClass) {
        await prisma.class.create({
          data: classData
        })
        console.log(`✅ Clase creada: ${classData.name}`)
      } else {
        console.log(`⚠️ Clase ya existe: ${classData.name}`)
      }
    }

    console.log('🎉 Clases de ejemplo creadas exitosamente!')
    
  } catch (error) {
    console.error('❌ Error creando clases:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSampleClasses() 