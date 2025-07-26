// Script de prueba para verificar la conexión a la base de datos y usuarios
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // List users
    console.log('\n👥 Fetching users...')
    const users = await prisma.user.findMany({
      include: {
        trainer: true
      }
    })
    
    console.log(`Found ${users.length} users:`)
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`)
    })
    
    // Test password hashing
    if (users.length > 0) {
      const testUser = users[0]
      console.log(`\n🔐 Testing password for user: ${testUser.email}`)
      
      // Asumiendo que la contraseña es "123456" para testing
      const testPassword = "123456"
      const isValid = await bcrypt.compare(testPassword, testUser.password)
      console.log(`Password "${testPassword}" is valid: ${isValid}`)
      
      // También probar otras contraseñas comunes
      const commonPasswords = ["password", "admin", "123", "test", "123456789", "admin123", "paradise", "dance", "academy"]
      for (const pwd of commonPasswords) {
        const valid = await bcrypt.compare(pwd, testUser.password)
        if (valid) {
          console.log(`✅ Password "${pwd}" is valid for ${testUser.email}`)
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabase()
