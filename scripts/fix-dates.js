const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

function normalizeDateString(dateString) {
  if (!dateString) return null
  
  console.log('Processing date:', dateString)
  
  // Si ya está en formato YYYY-MM-DD, devolverlo
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    console.log('  Already in correct format')
    return dateString
  }
  
  try {
    // Manejar formato DD/MM/YYYY o D/M/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('/')
      const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      console.log('  Converted DD/MM/YYYY:', dateString, '->', normalized)
      return normalized
    }
    
    // Manejar formato DD-MM-YYYY o D-M-YYYY
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateString)) {
      const [day, month, year] = dateString.split('-')
      const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      console.log('  Converted DD-MM-YYYY:', dateString, '->', normalized)
      return normalized
    }
    
    // Manejar formato YYYY/MM/DD
    if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('/')
      const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      console.log('  Converted YYYY/MM/DD:', dateString, '->', normalized)
      return normalized
    }
    
    // Intentar convertir con Date (último recurso)
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const normalized = date.toISOString().split('T')[0]
      console.log('  Converted using Date:', dateString, '->', normalized)
      return normalized
    }
  } catch (error) {
    console.error('  Error processing date:', error)
  }
  
  console.log('  Could not process date, keeping original:', dateString)
  return dateString
}

async function fixDates() {
  console.log('🔧 Starting date normalization...')
  
  try {
    // Obtener todos los registros con fechas de nacimiento
    const enrollmentData = await prisma.studentEnrollmentData.findMany({
      where: {
        birthDate: {
          not: null
        }
      },
      select: {
        id: true,
        studentId: true,
        birthDate: true
      }
    })
    
    console.log(`Found ${enrollmentData.length} records with birth dates`)
    
    let updatedCount = 0
    let errorCount = 0
    
    for (const record of enrollmentData) {
      try {
        const originalDate = record.birthDate
        const normalizedDate = normalizeDateString(originalDate)
        
        if (originalDate !== normalizedDate) {
          console.log(`Updating record ${record.id} (Student ${record.studentId}):`)
          console.log(`  From: ${originalDate}`)
          console.log(`  To: ${normalizedDate}`)
          
          await prisma.studentEnrollmentData.update({
            where: { id: record.id },
            data: { birthDate: normalizedDate }
          })
          
          updatedCount++
        }
      } catch (error) {
        console.error(`Error updating record ${record.id}:`, error)
        errorCount++
      }
    }
    
    console.log('✅ Date normalization completed!')
    console.log(`📊 Results:`)
    console.log(`  - Total records processed: ${enrollmentData.length}`)
    console.log(`  - Records updated: ${updatedCount}`)
    console.log(`  - Errors: ${errorCount}`)
    
  } catch (error) {
    console.error('❌ Error during date normalization:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
fixDates()
