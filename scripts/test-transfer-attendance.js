const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testTransferAttendance() {
  try {
    console.log('🧪 Probando sistema de transferencia y asistencia...')

    // 1. Obtener todas las clases activas
    const classes = await prisma.danceClass.findMany({
      where: { isActive: true },
      include: {
        enrollments: {
          where: { isActive: true },
          include: {
            student: true
          }
        },
        sessions: {
          where: {
            date: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999))
            }
          },
          include: {
            attendances: {
              include: {
                student: true
              }
            }
          }
        }
      }
    })

    console.log(`📚 Encontradas ${classes.length} clases activas`)

    // 2. Buscar una clase con estudiantes inscritos
    const classWithStudents = classes.find(c => c.enrollments.length > 0)
    
    if (!classWithStudents) {
      console.log('❌ No se encontraron clases con estudiantes inscritos')
      return
    }

    console.log(`\n🎯 Clase seleccionada: ${classWithStudents.name}`)
    console.log(`👥 Estudiantes inscritos: ${classWithStudents.enrollments.length}`)
    
    // 3. Mostrar estudiantes inscritos
    classWithStudents.enrollments.forEach((enrollment, index) => {
      console.log(`  ${index + 1}. ${enrollment.student.name} (${enrollment.student.id}) - Activo: ${enrollment.isActive}`)
    })

    // 4. Buscar otra clase para transferir
    const targetClass = classes.find(c => c.id !== classWithStudents.id && c.sport === classWithStudents.sport)
    
    if (!targetClass) {
      console.log('❌ No se encontró una clase destino para la transferencia')
      return
    }

    console.log(`\n🎯 Clase destino: ${targetClass.name}`)
    console.log(`👥 Estudiantes inscritos: ${targetClass.enrollments.length}`)

    // 5. Simular una transferencia (sin ejecutarla realmente)
    const studentToTransfer = classWithStudents.enrollments[0]
    
    if (!studentToTransfer) {
      console.log('❌ No hay estudiantes para transferir')
      return
    }

    console.log(`\n🔄 Simulando transferencia de: ${studentToTransfer.student.name}`)
    console.log(`   Desde: ${classWithStudents.name}`)
    console.log(`   Hacia: ${targetClass.name}`)

    // 6. Verificar el estado actual de las inscripciones
    console.log('\n📊 Estado actual de inscripciones:')
    
    const allEnrollments = await prisma.classEnrollment.findMany({
      where: {
        studentId: studentToTransfer.student.id
      },
      include: {
        danceClass: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    allEnrollments.forEach(enrollment => {
      console.log(`  - ${enrollment.danceClass.name}: ${enrollment.isActive ? 'Activo' : 'Inactivo'}`)
    })

    // 7. Verificar sesiones de hoy
    console.log('\n📅 Sesiones de hoy:')
    const todaySessions = await prisma.classSession.findMany({
      where: {
        classId: classWithStudents.id,
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
                student: true
              }
            }
          }
        },
        attendances: {
          include: {
            student: true
          }
        }
      }
    })

    todaySessions.forEach(session => {
      console.log(`\n  Sesión ${session.id}:`)
      console.log(`    Estudiantes inscritos activos: ${session.danceClass.enrollments.length}`)
      session.danceClass.enrollments.forEach(enrollment => {
        console.log(`      - ${enrollment.student.name} (${enrollment.student.id})`)
      })
      
      console.log(`    Asistencias registradas: ${session.attendances.length}`)
      session.attendances.forEach(attendance => {
        console.log(`      - ${attendance.student.name} (${attendance.student.id}): ${attendance.status}`)
      })
    })

    // 8. Verificar que el endpoint de class-sessions filtra correctamente
    console.log('\n🔍 Verificando endpoint de class-sessions...')
    
    const sessionsWithActiveEnrollments = await prisma.classSession.findMany({
      where: {
        classId: classWithStudents.id,
        date: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      },
      include: {
        danceClass: {
          include: {
            enrollments: {
              where: { isActive: true }, // Este es el filtro clave
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
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    console.log(`\n✅ Sesiones con inscripciones activas filtradas:`)
    sessionsWithActiveEnrollments.forEach(session => {
      console.log(`  Sesión ${session.id}:`)
      console.log(`    Estudiantes activos: ${session.danceClass.enrollments.length}`)
      session.danceClass.enrollments.forEach(enrollment => {
        console.log(`      - ${enrollment.student.name} (${enrollment.student.id})`)
      })
    })

    console.log('\n✅ Prueba completada. El sistema debería mostrar solo estudiantes con inscripciones activas.')

  } catch (error) {
    console.error('❌ Error en la prueba:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testTransferAttendance() 