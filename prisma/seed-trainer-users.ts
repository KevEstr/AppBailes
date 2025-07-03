import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Función para generar email si no existe
function generateEmail(name: string): string {
  // Remover espacios y caracteres especiales, convertir a minúsculas
  const cleanName = name
    .toLowerCase()
    .replace(/\s+/g, '')  // Quitar espacios
    .replace(/[áàäâã]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöôõ]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]/g, '') // Quitar caracteres especiales
  
  return `${cleanName}@paradisedance.com`
}

// Función para generar contraseña
function generatePassword(name: string): string {
  // Remover espacios y agregar 123
  const cleanName = name.replace(/\s+/g, '').toLowerCase()
  return `${cleanName}123`
}

async function main() {
  console.log('🌱 Creando usuarios para todos los instructores...')

  // Obtener todos los trainers activos
  const trainers = await prisma.trainer.findMany({
    where: { isActive: true },
    include: {
      user: true // Incluir el usuario si ya existe
    }
  })

  console.log(`📚 Encontrados ${trainers.length} instructores activos`)

  let usersCreated = 0
  let usersSkipped = 0

  for (const trainer of trainers) {
    // Verificar si ya tiene usuario
    if (trainer.user) {
      console.log(`⚠️  El instructor ${trainer.name} ya tiene usuario: ${trainer.user.email}`)
      usersSkipped++
      continue
    }

    try {
      // Usar email existente o generar uno nuevo
      const email = trainer.email || generateEmail(trainer.name)
      
      // Generar contraseña: nombre + 123
      const password = generatePassword(trainer.name)
      const hashedPassword = await bcrypt.hash(password, 12)

      // Verificar si ya existe un usuario con ese email
      const existingUser = await prisma.user.findUnique({
        where: { email: email }
      })

      if (existingUser) {
        console.log(`⚠️  Ya existe usuario con email ${email}. Saltando instructor ${trainer.name}`)
        usersSkipped++
        continue
      }

      // Crear el usuario
      const newUser = await prisma.user.create({
        data: {
          email: email,
          password: hashedPassword,
          name: trainer.name,
          role: 'TEACHER',
          trainerId: trainer.id,
          isActive: true
        }
      })

      console.log(`✅ Usuario creado para ${trainer.name}:`)
      console.log(`   📧 Email: ${email}`)
      console.log(`   🔑 Contraseña: ${password}`)
      console.log(`   👤 Rol: TEACHER`)
      console.log(`   🆔 Trainer ID: ${trainer.id}`)
      console.log('')

      usersCreated++

    } catch (error) {
      console.error(`❌ Error creando usuario para ${trainer.name}:`, error)
    }
  }

  console.log('🎉 ¡Proceso completado!')
  console.log(`📊 Resumen:`)
  console.log(`   ✅ Usuarios creados: ${usersCreated}`)
  console.log(`   ⚠️  Usuarios omitidos (ya existían): ${usersSkipped}`)
  console.log(`   📚 Total instructores: ${trainers.length}`)
  
  if (usersCreated > 0) {
    console.log('')
    console.log('🔑 CREDENCIALES DE ACCESO PARA INSTRUCTORES:')
    console.log('=' .repeat(50))
    
    // Mostrar todos los usuarios instructor con sus credenciales
    const instructorUsers = await prisma.user.findMany({
      where: { 
        role: 'TEACHER',
        trainerId: { not: null }
      },
      include: {
        trainer: true
      }
    })

    for (const user of instructorUsers) {
      const password = generatePassword(user.trainer!.name)
      console.log(`👨‍🏫 ${user.trainer!.name}:`)
      console.log(`   📧 Email: ${user.email}`)
      console.log(`   🔑 Contraseña: ${password}`)
      console.log('')
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed de usuarios para instructores:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 