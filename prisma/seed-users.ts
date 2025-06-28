const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Creando usuarios iniciales...')

  // Crear usuario administrador
  const adminPassword = await bcrypt.hash('admin123', 12)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@paradisedance.com' },
    update: {},
    create: {
      email: 'admin@paradisedance.com',
      password: adminPassword,
      name: 'Administrador Paradise',
      role: 'ADMIN',
      isActive: true
    }
  })

  console.log('✅ Usuario administrador creado:', admin.email)

  // Obtener algunos trainers existentes para crear usuarios profesor
  const trainers = await prisma.trainer.findMany({
    take: 3,
    where: {
      isActive: true
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
      const teacherEmail = trainer.email || `profesor${trainer.id}@paradisedance.com`
      
      const teacher = await prisma.user.upsert({
        where: { email: teacherEmail },
        update: {},
        create: {
          email: teacherEmail,
          password: teacherPassword,
          name: trainer.name,
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

  console.log('🎉 Usuarios iniciales creados exitosamente!')
  console.log('')
  console.log('📋 Credenciales de acceso:')
  console.log('👑 ADMINISTRADOR:')
  console.log('   Email: admin@paradisedance.com')
  console.log('   Contraseña: admin123')
  console.log('')
  console.log('👨‍🏫 PROFESORES:')
  console.log('   Contraseña para todos: teacher123')
  
  for (const trainer of trainers) {
    const teacherEmail = trainer.email || `profesor${trainer.id}@paradisedance.com`
    console.log(`   Email: ${teacherEmail} (${trainer.name})`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Error creando usuarios:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 