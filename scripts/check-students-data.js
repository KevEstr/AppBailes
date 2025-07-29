const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkStudentsData() {
  try {
    console.log('🔍 Verificando datos de estudiantes...')
    
    // Verificar estudiantes
    const students = await prisma.student.findMany({
      include: {
        user: true,
        classEnrollments: {
          include: {
            danceClass: {
              include: {
                trainer: true
              }
            }
          }
        }
      }
    })
    
    console.log(`📊 Total de estudiantes: ${students.length}`)
    
    if (students.length > 0) {
      console.log('\n👥 Primeros 3 estudiantes:')
      students.slice(0, 3).forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.id}) - ${student.phone}`)
        console.log(`   Email: ${student.user?.email || 'Sin email'}`)
        console.log(`   Enrollments: ${student.classEnrollments.length}`)
        console.log(`   Activo: ${student.isActive}`)
        console.log('')
      })
    } else {
      console.log('❌ No hay estudiantes en la base de datos')
    }
    
    // Verificar enrollments
    const enrollments = await prisma.classEnrollment.findMany({
      include: {
        student: true,
        danceClass: {
          include: {
            trainer: true
          }
        }
      }
    })
    
    console.log(`📚 Total de enrollments: ${enrollments.length}`)
    
    if (enrollments.length > 0) {
      console.log('\n🎓 Primeros 3 enrollments:')
      enrollments.slice(0, 3).forEach((enrollment, index) => {
        console.log(`${index + 1}. ${enrollment.student.name} -> ${enrollment.danceClass.name}`)
        console.log(`   Activo: ${enrollment.isActive}`)
        console.log(`   Trainer: ${enrollment.danceClass.trainer.name}`)
        console.log('')
      })
    } else {
      console.log('❌ No hay enrollments en la base de datos')
    }
    
    // Verificar clases
    const classes = await prisma.danceClass.findMany({
      include: {
        trainer: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      }
    })
    
    console.log(`🏫 Total de clases: ${classes.length}`)
    
    if (classes.length > 0) {
      console.log('\n📖 Primeras 3 clases:')
      classes.slice(0, 3).forEach((danceClass, index) => {
        console.log(`${index + 1}. ${danceClass.name} (${danceClass.sport || 'Sin deporte'})`)
        console.log(`   Trainer: ${danceClass.trainer.name}`)
        console.log(`   Enrollments: ${danceClass._count.enrollments}`)
        console.log(`   Activo: ${danceClass.isActive}`)
        console.log('')
      })
    } else {
      console.log('❌ No hay clases en la base de datos')
    }
    
  } catch (error) {
    console.error('❌ Error verificando datos:', error)
    console.error('Detalles del error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkStudentsData() 