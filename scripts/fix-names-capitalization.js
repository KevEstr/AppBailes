#!/usr/bin/env node

/**
 * Script para corregir la capitalización de nombres en la base de datos
 * Aplica la función de capitalización correcta a todos los nombres existentes
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Función para capitalizar nombres (copiada del backend)
function capitalizeName(name) {
  if (!name || typeof name !== 'string') return ''
  
  return name
    .toLowerCase()
    .trim()
    .split(' ')
    .filter(word => word.length > 0) // Filtrar espacios vacíos
    .map(word => {
      if (word.length === 0) return word
      // Obtener el primer carácter y el resto
      const firstChar = word.charAt(0)
      const rest = word.slice(1)
      
      // Capitalizar el primer carácter manteniendo tildes
      const capitalizedFirst = firstChar.toUpperCase()
      
      return capitalizedFirst + rest
    })
    .join(' ')
}

async function fixStudentNames() {
  console.log('🔧 Iniciando corrección de nombres en la base de datos...')
  
  try {
    // Obtener todos los estudiantes
    const students = await prisma.student.findMany({
      select: {
        id: true,
        name: true
      }
    })
    
    console.log(`📊 Encontrados ${students.length} estudiantes`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    for (const student of students) {
      const originalName = student.name
      const capitalizedName = capitalizeName(originalName)
      
      // Solo actualizar si el nombre cambió
      if (originalName !== capitalizedName) {
        await prisma.student.update({
          where: { id: student.id },
          data: { name: capitalizedName }
        })
        
        console.log(`✅ ${student.id}: "${originalName}" → "${capitalizedName}"`)
        updatedCount++
      } else {
        console.log(`⏭️  ${student.id}: "${originalName}" (ya está correcto)`)
        skippedCount++
      }
    }
    
    console.log('\n📈 Resumen:')
    console.log(`✅ Nombres actualizados: ${updatedCount}`)
    console.log(`⏭️  Nombres sin cambios: ${skippedCount}`)
    console.log(`📊 Total procesados: ${students.length}`)
    
  } catch (error) {
    console.error('❌ Error al corregir nombres:', error)
    throw error
  }
}

async function fixEmergencyContactNames() {
  console.log('\n🔧 Corrigiendo nombres de contactos de emergencia...')
  
  try {
    // Obtener todos los datos de inscripción con contactos de emergencia
    const enrollmentData = await prisma.studentEnrollmentData.findMany({
      where: {
        emergencyContactName: {
          not: null
        }
      },
      select: {
        id: true,
        emergencyContactName: true,
        studentId: true
      }
    })
    
    console.log(`📊 Encontrados ${enrollmentData.length} contactos de emergencia`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    for (const data of enrollmentData) {
      const originalName = data.emergencyContactName
      const capitalizedName = capitalizeName(originalName)
      
      // Solo actualizar si el nombre cambió
      if (originalName !== capitalizedName) {
        await prisma.studentEnrollmentData.update({
          where: { id: data.id },
          data: { emergencyContactName: capitalizedName }
        })
        
        console.log(`✅ Estudiante ${data.studentId}: "${originalName}" → "${capitalizedName}"`)
        updatedCount++
      } else {
        console.log(`⏭️  Estudiante ${data.studentId}: "${originalName}" (ya está correcto)`)
        skippedCount++
      }
    }
    
    console.log('\n📈 Resumen contactos de emergencia:')
    console.log(`✅ Nombres actualizados: ${updatedCount}`)
    console.log(`⏭️  Nombres sin cambios: ${skippedCount}`)
    console.log(`📊 Total procesados: ${enrollmentData.length}`)
    
  } catch (error) {
    console.error('❌ Error al corregir nombres de contactos:', error)
    throw error
  }
}

async function main() {
  console.log('🚀 Script de corrección de capitalización de nombres')
  console.log('=' .repeat(60))
  
  try {
    // Corregir nombres de estudiantes
    await fixStudentNames()
    
    // Corregir nombres de contactos de emergencia
    await fixEmergencyContactNames()
    
    console.log('\n🎉 ¡Corrección completada exitosamente!')
    
  } catch (error) {
    console.error('\n💥 Error durante la corrección:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
if (require.main === module) {
  main()
}

module.exports = { capitalizeName, fixStudentNames, fixEmergencyContactNames }
