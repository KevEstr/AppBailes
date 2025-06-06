import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🗑️ Limpiando base de datos...')
  // Clear existing data in correct order
  await prisma.attendance.deleteMany({})
  await prisma.classSession.deleteMany({})
  await prisma.classEnrollment.deleteMany({})
  await prisma.classSchedule.deleteMany({})
  await prisma.danceClass.deleteMany({})
  await prisma.sportLocation.deleteMany({})
  await prisma.trainer.deleteMany({})
  await prisma.receipt.deleteMany({})
  await prisma.debt.deleteMany({})
  await prisma.massiveMessage.deleteMany({})
  await prisma.student.deleteMany({})

  // Create trainers
  console.log('👨‍🏫 Creando entrenadores...')
  
  // Dance trainers
  const karenOspina = await prisma.trainer.create({
    data: {
      name: 'Karen Ospina',
      email: 'karen.ospina@paradisedance.com',
      phone: '3001234567',
    },
  })

  const luisaMachado = await prisma.trainer.create({
    data: {
      name: 'Luisa Machado Duque',
      email: 'luisa.machado@paradisedance.com',
      phone: '3009876543',
    },
  })

  // Sports trainers
  const angelica = await prisma.trainer.create({
    data: {
      name: 'Angelica',
      email: 'angelica@paradisesports.com',
      phone: '3005555555',
    },
  })

  const andresVera = await prisma.trainer.create({
    data: {
      name: 'Andres Vera',
      email: 'andres.vera@paradisesports.com',
      phone: '3006666666',
    },
  })

  const andresArroyave = await prisma.trainer.create({
    data: {
      name: 'Andres Arroyave',
      email: 'andres.arroyave@paradisesports.com',
      phone: '3007777777',
    },
  })

  const andres = await prisma.trainer.create({
    data: {
      name: 'Andres',
      email: 'andres@paradisesports.com',
      phone: '3007777778',
    },
  })

  const david = await prisma.trainer.create({
    data: {
      name: 'David',
      email: 'david@paradisesports.com',
      phone: '3008888888',
    },
  })

  const camila = await prisma.trainer.create({
    data: {
      name: 'Camila',
      email: 'camila@paradisesports.com',
      phone: '3009999999',
    },
  })

  const yennifer = await prisma.trainer.create({
    data: {
      name: 'Yennifer',
      email: 'yennifer@paradisesports.com',
      phone: '3001111110',
    },
  })

  const santiago = await prisma.trainer.create({
    data: {
      name: 'Santiago',
      email: 'santiago@paradisesports.com',
      phone: '3001111111',
    },
  })

  // Create sport locations
  console.log('🏟️ Creando ubicaciones deportivas...')
  const placaCarmen = await prisma.sportLocation.create({
    data: {
      name: 'Placa Polideportiva del Carmen',
      address: 'Barrio El Carmen',
    },
  })

  const placaComfenalco = await prisma.sportLocation.create({
    data: {
      name: 'Placa Cubierta de Villas de Comfenalco',
      address: 'Villas de Comfenalco',
    },
  })

  const placaPuertoBello = await prisma.sportLocation.create({
    data: {
      name: 'Placa Cubierta de Puerto Bello',
      address: 'Puerto Bello',
    },
  })

  const placaMesa = await prisma.sportLocation.create({
    data: {
      name: 'Placa Deportiva del Mesa',
      address: 'El Mesa',
    },
  })

  // Create students
  console.log('🎓 Creando estudiantes...')
  const student1 = await prisma.student.create({
    data: {
      id: 1036689216,
      name: 'Ana Martínez',
      email: 'ana@example.com',
      phone: '5551234567',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    },
  })

  const student2 = await prisma.student.create({
    data: {
      id: 1075234567,
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '5559876543',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan',
    },
  })

  const student3 = await prisma.student.create({
    data: {
      id: 1088345678,
      name: 'Carmen Delgado',
      email: 'carmen@example.com',
      phone: '5555678901',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carmen',
    },
  })

  const student4 = await prisma.student.create({
    data: {
      id: 1052456789,
      name: 'Roberto Silva',
      email: 'roberto@example.com',
      phone: '5554321098',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto',
    },
  })

  // Create dance classes with schedules  
  console.log('💃 Creando clases de baile...')
  
  // Karen Ospina classes
  const karenClass1 = await prisma.danceClass.create({
    data: {
      name: 'Martes y jueves 3:30 Pm a 5:00 Pm - Karen (Baile Urbano)',
      description: 'Clase de baile urbano con Karen Ospina',
      trainerId: karenOspina.id,
      capacity: 20,
      price: 50.00,
      type: 'DANCE',
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '15:30', endTime: '17:00' }, // Martes
          { dayOfWeek: 4, startTime: '15:30', endTime: '17:00' }  // Jueves
        ]
      }
    },
  })

  const karenClass2 = await prisma.danceClass.create({
    data: {
      name: 'Martes y jueves 5:00 Pm a 6:30 Pm - Karen (Baile Urbano)',
      description: 'Clase de baile urbano con Karen Ospina',
      trainerId: karenOspina.id,
      capacity: 20,
      price: 50.00,
      type: 'DANCE',
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '17:00', endTime: '18:30' }, // Martes
          { dayOfWeek: 4, startTime: '17:00', endTime: '18:30' }  // Jueves
        ]
      }
    },
  })

  const karenClass3 = await prisma.danceClass.create({
    data: {
      name: 'Martes y jueves 6:30 Pm a 8:00 Pm - Karen (Baile Urbano)',
      description: 'Clase de baile urbano con Karen Ospina',
      trainerId: karenOspina.id,
      capacity: 20,
      price: 50.00,
      type: 'DANCE',
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '18:30', endTime: '20:00' }, // Martes
          { dayOfWeek: 4, startTime: '18:30', endTime: '20:00' }  // Jueves
        ]
      }
    },
  })

  const karenClass4 = await prisma.danceClass.create({
    data: {
      name: 'Sábados y domingos 10:00 Am a 11:30 Am - Karen (Baile Urbano)',
      description: 'Clase de baile urbano con Karen Ospina',
      trainerId: karenOspina.id,
      capacity: 20,
      price: 50.00,
      type: 'DANCE',
      schedules: {
        create: [
          { dayOfWeek: 6, startTime: '10:00', endTime: '11:30' }, // Sábado
          { dayOfWeek: 0, startTime: '10:00', endTime: '11:30' }  // Domingo
        ]
      }
    },
  })

  // Luisa Machado Duque classes
  const luisaClass1 = await prisma.danceClass.create({
    data: {
      name: 'Miércoles y viernes 3:30 Pm a 5:00 Pm - Luisa (Baile Urbano)',
      description: 'Clase de baile urbano con Luisa Machado Duque',
      trainerId: luisaMachado.id,
      capacity: 20,
      price: 50.00,
      type: 'DANCE',
      schedules: {
        create: [
          { dayOfWeek: 3, startTime: '15:30', endTime: '17:00' }, // Miércoles
          { dayOfWeek: 5, startTime: '15:30', endTime: '17:00' }  // Viernes
        ]
      }
    },
  })

  const luisaClass2 = await prisma.danceClass.create({
    data: {
      name: 'Miércoles y viernes 5:00 Pm a 6:30 Pm - Luisa (Baile Urbano)',
      description: 'Clase de baile urbano con Luisa Machado Duque',
      trainerId: luisaMachado.id,
      capacity: 20,
      price: 50.00,
      type: 'DANCE',
      schedules: {
        create: [
          { dayOfWeek: 3, startTime: '17:00', endTime: '18:30' }, // Miércoles
          { dayOfWeek: 5, startTime: '17:00', endTime: '18:30' }  // Viernes
        ]
      }
    },
  })

  const luisaClass3 = await prisma.danceClass.create({
    data: {
      name: 'Miércoles y viernes 6:30 Pm a 8:00 Pm - Luisa (Baile Urbano)',
      description: 'Clase de baile urbano con Luisa Machado Duque',
      trainerId: luisaMachado.id,
      capacity: 20,
      price: 50.00,
      type: 'DANCE',
      schedules: {
        create: [
          { dayOfWeek: 3, startTime: '18:30', endTime: '20:00' }, // Miércoles
          { dayOfWeek: 5, startTime: '18:30', endTime: '20:00' }  // Viernes
        ]
      }
    },
  })

  // Sports classes organized by location
  console.log('🏃‍♂️ Creando clases deportivas...')
  
  // === PLACA POLIDEPORTIVA DEL CARMEN ===
  const carmenClass1 = await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 2:30 Pm a 4:00 Pm (Angelica)',
      description: 'Entrenamiento deportivo con Angelica en Placa del Carmen',
      trainerId: angelica.id,
      capacity: 25,
      price: 40.00,
      type: 'SPORTS',
      locationId: placaCarmen.id,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '14:30', endTime: '16:00' }, // Lunes
          { dayOfWeek: 3, startTime: '14:30', endTime: '16:00' }, // Miércoles
          { dayOfWeek: 5, startTime: '14:30', endTime: '16:00' }  // Viernes
        ]
      }
    },
  })

  const carmenClass2 = await prisma.danceClass.create({
    data: {
      name: 'Lunes, miércoles y viernes 4:00 Pm a 5:30 Pm (Angelica)',
      description: 'Entrenamiento deportivo con Angelica en Placa del Carmen',
      trainerId: angelica.id,
      capacity: 25,
      price: 40.00,
      type: 'SPORTS',
      locationId: placaCarmen.id,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '16:00', endTime: '17:30' }, // Lunes
          { dayOfWeek: 3, startTime: '16:00', endTime: '17:30' }, // Miércoles
          { dayOfWeek: 5, startTime: '16:00', endTime: '17:30' }  // Viernes
        ]
      }
    },
  })

  // Create enrollments
  console.log('📝 Creando inscripciones...')
  await prisma.classEnrollment.create({
    data: {
      studentId: student1.id,
      classId: karenClass1.id,
    },
  })

  await prisma.classEnrollment.create({
    data: {
      studentId: student2.id,
      classId: luisaClass2.id,
    },
  })

  await prisma.classEnrollment.create({
    data: {
      studentId: student3.id,
      classId: carmenClass1.id,
    },
  })

  // Create some class sessions for today
  console.log('📅 Creando sesiones de ejemplo...')
  const today = new Date()
  const startTime = new Date(today)
  startTime.setHours(18, 0, 0, 0)
  const endTime = new Date(today)
  endTime.setHours(19, 0, 0, 0)

  const todaySession = await prisma.classSession.create({
    data: {
      classId: karenClass1.id,
      date: today,
      startTime: startTime,
      endTime: endTime,
      status: 'SCHEDULED'
    },
  })

  // Create some attendance records
  console.log('✅ Creando registros de asistencia...')
  await prisma.attendance.create({
    data: {
      studentId: student1.id,
      sessionId: todaySession.id,
      status: 'PRESENT',
      date: new Date(),
    },
  })

  await prisma.attendance.create({
    data: {
      studentId: student2.id,
      sessionId: todaySession.id,
      status: 'PRESENT',
      date: new Date(),
    },
  })

  // Create some receipts
  console.log('🧾 Creando recibos...')
  await prisma.receipt.create({
    data: {
      studentId: student1.id,
      amount: 100.00,
      concept: 'Mensualidad Enero',
      paymentMethod: 'CASH',
    },
  })

  // Create some debts
  console.log('💳 Creando deudas...')
  await prisma.debt.create({
    data: {
      studentId: student2.id,
      amount: 150.00,
      concept: 'Mensualidad Febrero',
      dueDate: new Date(2024, 1, 28),
    },
  })

  // Create massive message
  console.log('📱 Creando mensaje masivo...')
  await prisma.massiveMessage.create({
    data: {
      type: 'PAYMENT_REMINDER',
      message: 'Recordatorio: Tu pago mensual está próximo a vencer.',
      targetGroup: 'All Students',
      sentCount: 3,
      recipients: {
        connect: [
          { id: student1.id },
          { id: student2.id },
          { id: student3.id }
        ]
      }
    },
  })

  console.log('✅ Seed completado exitosamente!')
  console.log('📊 Datos creados:')
  console.log('   👨‍🏫 10 entrenadores')
  console.log('   🏟️ 4 ubicaciones deportivas')
  console.log('   🎓 4 estudiantes')
  console.log('   💃 9 clases (7 baile + 2 deportes)')
  console.log('   📝 3 inscripciones')
  console.log('   📅 1 sesión')
  console.log('   ✅ 2 asistencias')
  console.log('   🧾 1 recibo')
  console.log('   💳 1 deuda')
  console.log('   📱 1 mensaje masivo')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 