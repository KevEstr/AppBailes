import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Create trainers
  console.log('👨‍🏫 Creando entrenadores...')
  const trainer1 = await prisma.trainer.create({
    data: {
      name: 'María González',
      email: 'maria@danceacademy.com',
      phone: '1234567890',
    },
  })

  const trainer2 = await prisma.trainer.create({
    data: {
      name: 'Carlos Rodríguez',
      email: 'carlos@danceacademy.com',
      phone: '0987654321',
    },
  })

  const trainer3 = await prisma.trainer.create({
    data: {
      name: 'Luis Martínez',
      email: 'luis@danceacademy.com',
      phone: '5556789012',
    },
  })

  // Create students with Colombian cedulas
  console.log('🎓 Creando estudiantes...')
  const student1 = await prisma.student.create({
    data: {
      id: "1036689216", // Cédula colombiana
      name: 'Ana Martínez',
      phone: '5551234567',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    },
  })

  const student2 = await prisma.student.create({
    data: {
      id: "1075234567", // Cédula colombiana
      name: 'Juan Pérez',
      phone: '5559876543',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan',
    },
  })

  const student3 = await prisma.student.create({
    data: {
      id: "1088345678", // Cédula colombiana
      name: 'Carmen Delgado',
      phone: '5555678901',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carmen',
    },
  })

  const student4 = await prisma.student.create({
    data: {
      id: "1052456789", // Cédula colombiana
      name: 'Roberto Silva',
      phone: '5554321098',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto',
    },
  })

  // Create dance classes with schedules
  console.log('💃 Creando clases de baile...')
  const salsaClass = await prisma.danceClass.create({
    data: {
      name: 'Salsa Básica',
      description: 'Aprende los pasos fundamentales de la salsa',
      trainerId: trainer1.id,
      capacity: 20,
      price: 50.00,
      schedules: {
        create: [
          { dayOfWeek: 1, startTime: '18:00', endTime: '19:00' }, // Lunes
          { dayOfWeek: 3, startTime: '18:00', endTime: '19:00' }  // Miércoles
        ]
      }
    },
  })

  const bachataClass = await prisma.danceClass.create({
    data: {
      name: 'Bachata Intermedio',
      description: 'Perfecciona tu técnica de bachata',
      trainerId: trainer2.id,
      capacity: 15,
      price: 60.00,
      schedules: {
        create: [
          { dayOfWeek: 2, startTime: '19:00', endTime: '20:00' }, // Martes
          { dayOfWeek: 4, startTime: '19:00', endTime: '20:00' }  // Jueves
        ]
      }
    },
  })

  const merengueClass = await prisma.danceClass.create({
    data: {
      name: 'Merengue y Reggaeton',
      description: 'Ritmos caribeños modernos',
      trainerId: trainer3.id,
      capacity: 25,
      price: 45.00,
      schedules: {
        create: [
          { dayOfWeek: 5, startTime: '20:00', endTime: '21:00' }, // Viernes
          { dayOfWeek: 6, startTime: '17:00', endTime: '18:00' }  // Sábado
        ]
      }
    },
  })

  // Create enrollments
  console.log('📝 Creando inscripciones...')
  await prisma.classEnrollment.create({
    data: {
      studentId: student1.id,
      classId: salsaClass.id,
    },
  })

  await prisma.classEnrollment.create({
    data: {
      studentId: student2.id,
      classId: salsaClass.id,
    },
  })

  await prisma.classEnrollment.create({
    data: {
      studentId: student3.id,
      classId: bachataClass.id,
    },
  })

  await prisma.classEnrollment.create({
    data: {
      studentId: student4.id,
      classId: merengueClass.id,
    },
  })

  await prisma.classEnrollment.create({
    data: {
      studentId: student1.id,
      classId: bachataClass.id,
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
      classId: salsaClass.id,
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
      concept: 'Mensualidad Diciembre',
      dueDate: new Date('2024-12-31'),
    },
  })

  // Create a massive message
  console.log('📢 Creando mensaje masivo...')
  await prisma.massiveMessage.create({
    data: {
      type: 'GENERAL',
      message: '¡Bienvenidos a la nueva temporada de baile!',
      targetGroup: 'Todos',
      recipients: {
        connect: [
          { id: student1.id },
          { id: student2.id },
          { id: student3.id },
          { id: student4.id },
        ],
      },
    },
  })

  // ===== CREAR USUARIOS PARA LOGIN =====
  console.log('👤 Creando usuarios para login...')
  
  // Crear usuario administrador
  const adminPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@paradisedance.com' },
    update: {},
    create: {
              email: 'admin@paradisedance.com',
        password: adminPassword,
        role: 'ADMIN',
      isActive: true
    }
  })

  console.log('✅ Usuario administrador creado:', admin.email)

  // Obtener trainers existentes para crear usuarios profesor
  const trainers = await prisma.trainer.findMany({
    take: 3,
    where: {
      isActive: true
    },
    include: {
      user: {
        select: {
          email: true
        }
      }
    }
  })

  // Crear usuarios profesor para los trainers
  for (const trainer of trainers) {
    const teacherPassword = await bcrypt.hash('teacher123', 12)
    
    // Verificar si ya existe un usuario para este trainer
    const existingUser = await prisma.user.findUnique({
      where: { trainerId: trainer.id }
    })

    if (!existingUser) {
      const teacherEmail = trainer.user?.email || `profesor${trainer.id}@paradisedance.com`
      
      const teacher = await prisma.user.upsert({
        where: { email: teacherEmail },
        update: {},
        create: {
                      email: teacherEmail,
            password: teacherPassword,
            role: 'TEACHER',
          trainerId: trainer.id,
          isActive: true
        }
      })

      console.log('✅ Usuario profesor creado:', teacher.email, 'para trainer:', trainer.name)
    } else {
      console.log('⚠️ Ya existe usuario para trainer:', trainer.name)
    }
  }

  console.log('🎉 ¡Base de datos poblada exitosamente!')
  console.log('📊 Resumen:')
  console.log(`   👨‍🏫 ${await prisma.trainer.count()} entrenadores`)
  console.log(`   🎓 ${await prisma.student.count()} estudiantes`)
  console.log(`   💃 ${await prisma.danceClass.count()} clases`)
  console.log(`   📝 ${await prisma.classEnrollment.count()} inscripciones`)
  console.log(`   📅 ${await prisma.classSession.count()} sesiones`)
  console.log(`   ✅ ${await prisma.attendance.count()} asistencias`)
  console.log(`   👤 ${await prisma.user.count()} usuarios`)
  console.log('')
  console.log('🔑 CREDENCIALES DE ACCESO:')
  console.log('👑 ADMINISTRADOR:')
  console.log('   Email: admin@paradisedance.com')
  console.log('   Contraseña: admin123')
  console.log('')
  console.log('👨‍🏫 PROFESORES:')
  console.log('   Contraseña para todos: teacher123')
  
  for (const trainer of trainers) {
    const teacherEmail = trainer.user?.email || `profesor${trainer.id}@paradisedance.com`
    console.log(`   Email: ${teacherEmail} (${trainer.name})`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })