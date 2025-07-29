const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function simulateTransfer() {
  try {
    console.log('🔄 Simulando transferencia de estudiante...')

    // 1. Obtener clases activas con estudiantes
    const classes = await prisma.danceClass.findMany({
      where: { isActive: true },
      include: {
        enrollments: {
          where: { isActive: true },
          include: {
            student: true
          }
        }
      }
    })

    // Buscar una clase con estudiantes
    const sourceClass = classes.find(c => c.enrollments.length > 0)
    const targetClass = classes.find(c => c.id !== sourceClass?.id && c.sport === sourceClass?.sport)

    if (!sourceClass || !targetClass) {
      console.log('❌ No se encontraron clases adecuadas para la transferencia')
      return
    }

    console.log(`\n📚 Clase origen: ${sourceClass.name} (${sourceClass.enrollments.length} estudiantes)`)
    console.log(`📚 Clase destino: ${targetClass.name} (${targetClass.enrollments.length} estudiantes)`)

    const studentToTransfer = sourceClass.enrollments[0]
    console.log(`\n👤 Estudiante a transferir: ${studentToTransfer.student.name} (${studentToTransfer.student.id})`)

    // 2. Verificar estado antes de la transferencia
    console.log('\n📊 Estado ANTES de la transferencia:')
    
    const beforeEnrollments = await prisma.classEnrollment.findMany({
      where: { studentId: studentToTransfer.student.id },
      include: {
        danceClass: { select: { id: true, name: true } }
      }
    })

    beforeEnrollments.forEach(enrollment => {
      console.log(`  - ${enrollment.danceClass.name}: ${enrollment.isActive ? 'Activo' : 'Inactivo'}`)
    })

    // 3. Simular la transferencia (desactivar inscripción actual)
    console.log('\n🔄 Desactivando inscripción en clase origen...')
    
    await prisma.classEnrollment.update({
      where: { id: studentToTransfer.id },
      data: { isActive: false }
    })

    // 4. Verificar si existe inscripción en clase destino
    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: studentToTransfer.student.id,
          classId: targetClass.id
        }
      }
    })

    if (existingEnrollment) {
      console.log('🔄 Reactivando inscripción existente en clase destino...')
      await prisma.classEnrollment.update({
        where: { id: existingEnrollment.id },
        data: { 
          isActive: true,
          enrolledAt: new Date()
        }
      })
    } else {
      console.log('🔄 Creando nueva inscripción en clase destino...')
      await prisma.classEnrollment.create({
        data: {
          studentId: studentToTransfer.student.id,
          classId: targetClass.id
        }
      })
    }

    // 5. Verificar estado después de la transferencia
    console.log('\n📊 Estado DESPUÉS de la transferencia:')
    
    const afterEnrollments = await prisma.classEnrollment.findMany({
      where: { studentId: studentToTransfer.student.id },
      include: {
        danceClass: { select: { id: true, name: true } }
      }
    })

    afterEnrollments.forEach(enrollment => {
      console.log(`  - ${enrollment.danceClass.name}: ${enrollment.isActive ? 'Activo' : 'Inactivo'}`)
    })

    // 6. Verificar que el endpoint de class-sessions filtra correctamente
    console.log('\n🔍 Verificando endpoint de class-sessions para clase origen:')
    
    const sessionsFromSource = await prisma.classSession.findMany({
      where: {
        classId: sourceClass.id,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      include: {
        danceClass: {
          include: {
            enrollments: {
              where: { isActive: true }, // Solo inscripciones activas
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    hasDebt: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    console.log(`\n📅 Sesiones de hoy en clase origen:`)
    if (sessionsFromSource.length === 0) {
      console.log('  No hay sesiones programadas para hoy')
    } else {
      sessionsFromSource.forEach(session => {
        console.log(`  Sesión ${session.id}:`)
        console.log(`    Estudiantes activos: ${session.danceClass.enrollments.length}`)
        session.danceClass.enrollments.forEach(enrollment => {
          console.log(`      - ${enrollment.student.name} (${enrollment.student.id})`)
        })
      })
    }

    // 7. Verificar que el estudiante transferido NO aparece en la clase origen
    const studentStillInSource = sessionsFromSource.some(session => 
      session.danceClass.enrollments.some(enrollment => 
        enrollment.student.id === studentToTransfer.student.id
      )
    )

    if (studentStillInSource) {
      console.log('\n❌ PROBLEMA: El estudiante transferido SÍ aparece en la clase origen')
    } else {
      console.log('\n✅ CORRECTO: El estudiante transferido NO aparece en la clase origen')
    }

    // 8. Verificar que aparece en la clase destino
    console.log('\n🔍 Verificando endpoint de class-sessions para clase destino:')
    
    const sessionsFromTarget = await prisma.classSession.findMany({
      where: {
        classId: targetClass.id,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      include: {
        danceClass: {
          include: {
            enrollments: {
              where: { isActive: true },
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    hasDebt: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    console.log(`\n📅 Sesiones de hoy en clase destino:`)
    if (sessionsFromTarget.length === 0) {
      console.log('  No hay sesiones programadas para hoy')
    } else {
      sessionsFromTarget.forEach(session => {
        console.log(`  Sesión ${session.id}:`)
        console.log(`    Estudiantes activos: ${session.danceClass.enrollments.length}`)
        session.danceClass.enrollments.forEach(enrollment => {
          console.log(`      - ${enrollment.student.name} (${enrollment.student.id})`)
        })
      })
    }

    const studentInTarget = sessionsFromTarget.some(session => 
      session.danceClass.enrollments.some(enrollment => 
        enrollment.student.id === studentToTransfer.student.id
      )
    )

    if (studentInTarget) {
      console.log('\n✅ CORRECTO: El estudiante transferido SÍ aparece en la clase destino')
    } else {
      console.log('\n⚠️ El estudiante transferido NO aparece en la clase destino (puede ser normal si no hay sesiones hoy)')
    }

    console.log('\n✅ Simulación completada exitosamente')

  } catch (error) {
    console.error('❌ Error en la simulación:', error)
  } finally {
    await prisma.$disconnect()
  }
}

simulateTransfer() 