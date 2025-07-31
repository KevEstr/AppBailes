import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearAllStudents() {
  try {
    console.log('🚀 Iniciando limpieza de todos los estudiantes...')
    
    // 1. Primero, obtener estadísticas antes de borrar
    const studentCount = await prisma.student.count()
    const userStudentCount = await prisma.user.count({
      where: { role: 'STUDENT' }
    })
    const enrollmentDataCount = await prisma.studentEnrollmentData.count()
    const classEnrollmentCount = await prisma.classEnrollment.count()
    const debtCount = await prisma.debt.count()
    const receiptCount = await prisma.receipt.count()
    
    console.log('📊 Estadísticas actuales:')
    console.log(`- Estudiantes: ${studentCount}`)
    console.log(`- Usuarios con rol STUDENT: ${userStudentCount}`)
    console.log(`- Datos de inscripción: ${enrollmentDataCount}`)
    console.log(`- Inscripciones a clases: ${classEnrollmentCount}`)
    console.log(`- Deudas: ${debtCount}`)
    console.log(`- Recibos: ${receiptCount}`)
    
    // 2. Confirmar antes de proceder
    console.log('\n⚠️  ADVERTENCIA: Esta acción eliminará TODOS los datos de estudiantes.')
    console.log('Esto incluye:')
    console.log('- Todos los usuarios con rol STUDENT')
    console.log('- Todos los registros de estudiantes')
    console.log('- Todos los datos de inscripción')
    console.log('- Todas las inscripciones a clases')
    console.log('- Todas las deudas')
    console.log('- Todos los recibos')
    console.log('- Y cualquier otro dato relacionado')
    
    // 3. Borrar en orden correcto para evitar problemas de foreign key
    
    console.log('\n🗑️  Eliminando datos de estudiantes...')
    
    // Borrar deudas (se eliminan automáticamente por cascade cuando se borra el estudiante)
    console.log('Eliminando deudas...')
    await prisma.debt.deleteMany({})
    
    // Borrar recibos (se eliminan automáticamente por cascade cuando se borra el estudiante)
    console.log('Eliminando recibos...')
    await prisma.receipt.deleteMany({})
    
    // Borrar inscripciones a clases (se eliminan automáticamente por cascade cuando se borra el estudiante)
    console.log('Eliminando inscripciones a clases...')
    await prisma.classEnrollment.deleteMany({})
    
    // Borrar datos de inscripción (se eliminan automáticamente por cascade cuando se borra el estudiante)
    console.log('Eliminando datos de inscripción...')
    await prisma.studentEnrollmentData.deleteMany({})
    
    // Borrar estudiantes
    console.log('Eliminando estudiantes...')
    await prisma.student.deleteMany({})
    
    // Borrar usuarios con rol STUDENT
    console.log('Eliminando usuarios con rol STUDENT...')
    await prisma.user.deleteMany({
      where: { role: 'STUDENT' }
    })
    
    // 4. Verificar que se borraron todos los datos
    console.log('\n✅ Verificando limpieza...')
    
    const remainingStudents = await prisma.student.count()
    const remainingUserStudents = await prisma.user.count({
      where: { role: 'STUDENT' }
    })
    const remainingEnrollmentData = await prisma.studentEnrollmentData.count()
    const remainingClassEnrollments = await prisma.classEnrollment.count()
    const remainingDebts = await prisma.debt.count()
    const remainingReceipts = await prisma.receipt.count()
    
    console.log('📊 Estadísticas después de la limpieza:')
    console.log(`- Estudiantes restantes: ${remainingStudents}`)
    console.log(`- Usuarios con rol STUDENT restantes: ${remainingUserStudents}`)
    console.log(`- Datos de inscripción restantes: ${remainingEnrollmentData}`)
    console.log(`- Inscripciones a clases restantes: ${remainingClassEnrollments}`)
    console.log(`- Deudas restantes: ${remainingDebts}`)
    console.log(`- Recibos restantes: ${remainingReceipts}`)
    
    if (remainingStudents === 0 && 
        remainingUserStudents === 0 && 
        remainingEnrollmentData === 0 && 
        remainingClassEnrollments === 0 && 
        remainingDebts === 0 && 
        remainingReceipts === 0) {
      console.log('\n🎉 ¡Limpieza completada exitosamente!')
      console.log('Todos los datos de estudiantes han sido eliminados.')
    } else {
      console.log('\n⚠️  Algunos datos podrían no haberse eliminado completamente.')
      console.log('Revisa las estadísticas anteriores.')
    }
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el script
if (require.main === module) {
  clearAllStudents()
    .then(() => {
      console.log('\n✅ Script ejecutado correctamente')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error ejecutando el script:', error)
      process.exit(1)
    })
}

export { clearAllStudents } 