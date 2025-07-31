import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearAllStudentsSimple() {
  try {
    console.log('🚀 Iniciando limpieza simple de todos los estudiantes...')
    
    // Obtener estadísticas antes
    const studentCount = await prisma.student.count()
    const userStudentCount = await prisma.user.count({
      where: { role: 'STUDENT' }
    })
    
    console.log(`📊 Eliminando ${studentCount} estudiantes y ${userStudentCount} usuarios...`)
    
    // Como las relaciones están configuradas con CASCADE, 
    // solo necesitamos borrar los usuarios con rol STUDENT
    // Esto automáticamente eliminará todos los estudiantes relacionados
    // y todos los datos dependientes (enrollmentData, classEnrollments, debts, receipts, etc.)
    
    const deletedUsers = await prisma.user.deleteMany({
      where: { role: 'STUDENT' }
    })
    
    console.log(`✅ Eliminados ${deletedUsers.count} usuarios con rol STUDENT`)
    
    // Verificar que todo se borró
    const remainingStudents = await prisma.student.count()
    const remainingUserStudents = await prisma.user.count({
      where: { role: 'STUDENT' }
    })
    const remainingEnrollmentData = await prisma.studentEnrollmentData.count()
    const remainingClassEnrollments = await prisma.classEnrollment.count()
    const remainingDebts = await prisma.debt.count()
    const remainingReceipts = await prisma.receipt.count()
    
    console.log('\n📊 Verificación final:')
    console.log(`- Estudiantes restantes: ${remainingStudents}`)
    console.log(`- Usuarios STUDENT restantes: ${remainingUserStudents}`)
    console.log(`- Datos de inscripción restantes: ${remainingEnrollmentData}`)
    console.log(`- Inscripciones a clases restantes: ${remainingClassEnrollments}`)
    console.log(`- Deudas restantes: ${remainingDebts}`)
    console.log(`- Recibos restantes: ${remainingReceipts}`)
    
    if (remainingStudents === 0 && remainingUserStudents === 0) {
      console.log('\n🎉 ¡Limpieza completada exitosamente!')
    } else {
      console.log('\n⚠️  Algunos datos podrían no haberse eliminado completamente.')
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
  clearAllStudentsSimple()
    .then(() => {
      console.log('\n✅ Script ejecutado correctamente')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error ejecutando el script:', error)
      process.exit(1)
    })
}

export { clearAllStudentsSimple } 