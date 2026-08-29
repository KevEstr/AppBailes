import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'

const createEnrollmentSchema = z.object({
  studentId: z.string().min(1, 'ID de estudiante es requerido'),
  classId: z.number().int().positive('ID de clase debe ser un número positivo')
})

// GET - Obtener inscripciones
export async function GET(request: NextRequest) {
  // Declarar variables en ámbito más amplio para debugging
  let status, page, limit, search, validPage, validLimit, skip
  
  try {
    console.log('🔍 Iniciando GET /api/enrollments')
    
    const searchParams = request.nextUrl.searchParams
    status = searchParams.get('status')
    page = Number.parseInt(searchParams.get('page') || '1', 10)
    limit = Number.parseInt(searchParams.get('limit') || '10', 10)
    search = searchParams.get('search')
    const groupByStudent = searchParams.get('groupByStudent') === 'true'

    console.log('📊 Parámetros recibidos:', { status, page, limit, search, groupByStudent })

    // Validar y ajustar parámetros de paginación
    validPage = Math.max(1, page)
    validLimit = Math.min(50, Math.max(1, limit)) // Máximo 50 registros por página
    skip = (validPage - 1) * validLimit
    
    console.log('✅ Parámetros validados:', { validPage, validLimit, skip })

    if (groupByStudent) {
      // Lógica para agrupar por estudiante
      const enrollmentQuery: any = {}
      
      // Construir filtro de estudiante
      const studentFilter: any = {}
      
      // Agregar filtros de estado del estudiante
      if (status === 'active') {
        studentFilter.isActive = true
        // Para estudiantes activos, solo mostrar inscripciones activas
        enrollmentQuery.isActive = true
      } else if (status === 'inactive') {
        studentFilter.isActive = false
        // Para estudiantes inactivos, NO filtrar por estado de inscripción
        // Mostrar todos los estudiantes inactivos, tengan o no inscripciones activas
        // No establecer enrollmentQuery.isActive aquí
      }
      // Si status === 'all', no filtrar por estado de inscripción
      // Los estudiantes se buscarán directamente por su propio campo isActive

      // Agregar condiciones de búsqueda si existe un término
      // Combinar búsqueda con filtro de estado usando AND
      if (search) {
        const searchConditions = [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { id: { contains: search, mode: 'insensitive' } }
          ]
        
        // Si ya hay un filtro de isActive, combinarlo con la búsqueda usando AND
        if (studentFilter.isActive !== undefined) {
          studentFilter.AND = [
            { isActive: studentFilter.isActive },
            { OR: searchConditions }
          ]
          // Eliminar isActive del nivel superior ya que está en AND
          delete studentFilter.isActive
        } else {
          studentFilter.OR = searchConditions
        }
      }
      
      // Aplicar filtro de estudiante
      if (Object.keys(studentFilter).length > 0) {
        enrollmentQuery.student = studentFilter
      }

      console.log('🗄️ Ejecutando consulta agrupada por estudiante ordenada por fecha de inscripción (global)...')
      
      // 1) Obtener todos los estudiantes que cumplen el filtro (pueden o no tener inscripciones)
      const filteredStudents = await prisma.student.findMany({
        where: studentFilter,
        select: { id: true },
        orderBy: { id: 'desc' }
      })

      // 2) Obtener todas las inscripciones relacionadas (usadas solo para calcular la última fecha)
      const allEnrollments = await prisma.classEnrollment.findMany({
        where: enrollmentQuery,
        select: {
          studentId: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc' // Más recientes primero
        }
      })

      // 3) Mapear por estudiante la última fecha de inscripción
      const lastEnrollmentByStudent = new Map<string, Date>()
      for (const enrollment of allEnrollments) {
        const studentIdStr = String(enrollment.studentId)
        // Como viene ordenado desc, la primera vez que lo vemos es la fecha más reciente
        if (!lastEnrollmentByStudent.has(studentIdStr)) {
          lastEnrollmentByStudent.set(studentIdStr, enrollment.createdAt)
        }
      }

      // 4) Separar estudiantes con y sin fecha de inscripción
      type StudentWithLastDate = { id: string; lastDate: Date }
      const studentsWithDate: StudentWithLastDate[] = []
      const studentsWithoutDate: string[] = []

      for (const s of filteredStudents) {
        const idStr = String(s.id)
        const lastDate = lastEnrollmentByStudent.get(idStr)
        if (lastDate) {
          studentsWithDate.push({ id: idStr, lastDate })
        } else {
          studentsWithoutDate.push(idStr)
        }
      }

      // 5) Ordenar: primero por fecha de inscripción (desc), luego los que no tienen fecha
      studentsWithDate.sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime())
      const sortedStudentIds: string[] = [
        ...studentsWithDate.map(s => s.id),
        ...studentsWithoutDate
      ]
      
      console.log('📊 Estudiantes encontrados:', {
        total: sortedStudentIds.length,
        status,
        enrollmentQuery: JSON.stringify(enrollmentQuery, null, 2)
      })

      // Aplicar paginación a los IDs ordenados
      const paginatedStudentIds = sortedStudentIds.slice(skip, skip + validLimit)

      // Obtener estudiantes completos con solo sus inscripciones activas
      // En el listado de estudiantes, siempre mostramos solo las clases activas
      // Las clases inactivas son históricas (transferencias, cancelaciones) y no deben aparecer
      const enrollmentIncludeFilter = { isActive: true }
      
      const students = await prisma.student.findMany({
        where: {
          id: { in: paginatedStudentIds }
        },
        include: {
          user: { select: { email: true } },
          classEnrollments: {
            where: enrollmentIncludeFilter,
            include: {
              danceClass: {
                include: {
                  trainer: { select: { name: true } },
                  location: { select: { name: true, address: true } }
                }
              }
            }
          }
        }
      })

      // Ordenar los estudiantes según el orden de paginatedStudentIds
      const studentsMap = new Map(students.map(s => [s.id, s]))
      const orderedStudents = paginatedStudentIds
        .map(id => studentsMap.get(id))
        .filter((s): s is NonNullable<typeof s> => s !== undefined)

      // Contar estudiantes únicos basándose en las inscripciones agrupadas
      const totalStudents = sortedStudentIds.length

      // Obtener estadísticas generales
      const stats = await Promise.all([
        prisma.student.count({ where: { isActive: true } }),
        prisma.student.count({ where: { isActive: false } }),
        prisma.student.count({ where: { hasDebt: true } })
      ])

      // Calcular hasDebt dinámicamente para cada estudiante
      // Buscar pagos PENDING que están vencidos (dueDate < fecha actual)
      // El status OVERDUE es solo visual, en DB se mantiene como PENDING
      const studentIds = orderedStudents.map(s => s.id)
      const today = new Date()
      const overduePaymentsCount = await prisma.monthlyPayment.groupBy({
        by: ['studentId'],
        where: {
          studentId: { in: studentIds },
          status: { in: ['PENDING', 'OVERDUE'] }, // Incluir ambos por si acaso
          dueDate: {
            lt: today // Fecha de vencimiento menor a hoy = vencido
          }
        },
        _count: true
      })

      // Crear mapa para acceso rápido
      const overduePaymentsMap = new Map(overduePaymentsCount.map(p => [p.studentId, p._count]))

      // Transformar datos para el frontend
      const studentsWithClasses = orderedStudents.map(student => {
        // Calcular hasDebt dinámicamente - pagos vencidos basados en fecha
        const overduePayments = overduePaymentsMap.get(student.id) || 0
        const hasDebt = overduePayments > 0

        return {
        student: {
          id: student.id,
          name: student.name,
          phone: student.phone,
            hasDebt: hasDebt,
          isActive: student.isActive,
          avatar: student.avatar,
          user: student.user
        },
        classEnrollments: student.classEnrollments.map(enrollment => ({
          id: enrollment.id,
          studentId: enrollment.studentId,
          classId: enrollment.classId,
          isActive: enrollment.isActive,
          createdAt: enrollment.createdAt.toISOString(),
          paymentCutoffDay: enrollment.paymentCutoffDay,
          monthlyFee: enrollment.monthlyFee,
          student: {
            id: student.id,
            name: student.name,
            phone: student.phone,
            hasDebt: hasDebt,
            isActive: student.isActive,
            avatar: student.avatar,
            user: student.user
          },
          danceClass: {
            id: enrollment.danceClass.id,
            name: enrollment.danceClass.name,
            sport: enrollment.danceClass.sport,
            trainer: enrollment.danceClass.trainer,
            location: enrollment.danceClass.location
          }
        })),
        totalClasses: student.classEnrollments.length,
        activeClasses: student.classEnrollments.filter(ce => ce.isActive).length
        }
      })

      const totalPages = Math.ceil(totalStudents / validLimit)
      const hasNextPage = validPage < totalPages
      const hasPrevPage = validPage > 1

      return NextResponse.json({
        success: true,
        students: studentsWithClasses,
        pagination: {
          total: totalStudents,
          page: validPage,
          limit: validLimit,
          totalPages,
          hasNextPage,
          hasPrevPage
        },
        stats: {
          activeStudents: stats[0],
          inactiveStudents: stats[1],
          studentsWithDebt: stats[2]
        }
      })
    }

    // Lógica original para enrollments individuales
    const baseQuery: any = {
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined
    }

    // Agregar condiciones de búsqueda si existe un término
    if (search) {
      baseQuery.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { phone: { contains: search, mode: 'insensitive' } } },
        { student: { id: { contains: search, mode: 'insensitive' } } } // Buscar por cédula como string
      ].filter(Boolean)
    }

    console.log('🗄️ Ejecutando consultas a la base de datos...')
    console.log('📋 Query construida:', JSON.stringify(baseQuery, null, 2))
    
    // Ejecutar consultas en paralelo para mejor rendimiento
    const [enrollments, total, stats] = await Promise.all([
      prisma.classEnrollment.findMany({
        where: baseQuery,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
              hasDebt: true,
              isActive: true,
              avatar: true,
              user: { select: { email: true } }
            }
          },
          danceClass: {
            select: {
              id: true,
              name: true,
              sport: true,
              trainer: {
                select: {
                  name: true
                }
              },
              location: {
                select: {
                  name: true,
                  address: true
                }
              }
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: validLimit
      }),
      prisma.classEnrollment.count({
        where: baseQuery
      }),
      // Obtener estadísticas generales (sin filtros de paginación)
      Promise.all([
        // Total de estudiantes activos
        prisma.classEnrollment.count({
          where: {
            student: {
              isActive: true
            }
          }
        }),
        // Total de estudiantes inactivos
        prisma.classEnrollment.count({
          where: {
            student: {
              isActive: false
            }
          }
        }),
        // Total de estudiantes con deudas
        prisma.classEnrollment.count({
          where: {
            student: {
              hasDebt: true
            }
          }
        })
      ])
    ])
    
    console.log('✅ Consultas completadas:', { 
      enrollmentsCount: enrollments.length, 
      totalCount: total,
      stats: {
        activeStudents: stats[0],
        inactiveStudents: stats[1],
        studentsWithDebt: stats[2]
      }
    })

    // Calcular metadatos de paginación
    const totalPages = Math.ceil(total / validLimit)
    const hasNextPage = validPage < totalPages
    const hasPrevPage = validPage > 1

    return NextResponse.json({
      success: true,
      enrollments,
      pagination: {
        total,
        page: validPage,
        limit: validLimit,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      stats: {
        activeStudents: stats[0],
        inactiveStudents: stats[1],
        studentsWithDebt: stats[2]
      }
    })
  } catch (error) {
    // Log detallado del error para debugging
    console.error('❌ Error detallado en /api/enrollments GET:', {
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown',
      cause: error instanceof Error ? error.cause : undefined,
      params: {
        status,
        page,
        limit, 
        search,
        validPage,
        validLimit,
        skip
      }
    })
    
    // Determinar tipo de error específico
    let errorMessage = 'Error interno del servidor'
    let statusCode = 500
    
    if (error instanceof Error) {
      // Error de Prisma
      if (error.message.includes('prisma') || error.message.includes('database')) {
        errorMessage = 'Error de conexión a la base de datos'
        console.error('🔌 Error de base de datos detectado')
      }
      // Error de validación
      else if (error.message.includes('validation') || error.message.includes('invalid')) {
        errorMessage = 'Error de validación de datos'
        statusCode = 400
      }
      // Error de permisos
      else if (error.message.includes('permission') || error.message.includes('access')) {
        errorMessage = 'Error de permisos de acceso'
        statusCode = 403
      }
      // Error específico para debugging en desarrollo
      else if (process.env.NODE_ENV === 'development') {
        errorMessage = `Error específico: ${error.message}`
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: error instanceof Error ? error.message : 'Unknown error',
          type: error instanceof Error ? error.constructor.name : 'Unknown'
        } : undefined,
        timestamp: new Date().toISOString()
      },
      { status: statusCode }
    )
  }
}

// POST - Crear nueva inscripción
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createEnrollmentSchema.parse(body)

    // Verificar que el estudiante existe
    const student = await prisma.student.findUnique({
      where: { id: validatedData.studentId }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que la clase existe
    const danceClass = await prisma.danceClass.findUnique({
      where: { id: validatedData.classId },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { isActive: true }
            }
          }
        }
      }
    })

    if (!danceClass) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      )
    }

    // Verificar capacidad
    if (danceClass._count.enrollments >= danceClass.capacity) {
      return NextResponse.json(
        { error: 'La clase ha alcanzado su capacidad máxima' },
        { status: 400 }
      )
    }

    // Verificar si ya está inscrito
    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: validatedData.studentId,
          classId: validatedData.classId
        }
      }
    })

    if (existingEnrollment && existingEnrollment.isActive) {
      return NextResponse.json(
        { error: 'El estudiante ya está inscrito en esta clase' },
        { status: 400 }
      )
    }

    // Detectar inscripción previa inactiva del mismo deporte para heredar el día de
    // corte y la tarifa, y para registrar una transferencia que preserve la cadena
    // de cobros (evita el doble cobro al reinscribir tras un retiro).
    const previousInactiveEnrollment = await prisma.classEnrollment.findFirst({
      where: {
        studentId: validatedData.studentId,
        isActive: false,
        classId: { not: validatedData.classId },
        danceClass: { sport: danceClass.sport }
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }]
    })

    const inheritedCutoffDay = previousInactiveEnrollment?.paymentCutoffDay ?? undefined
    const inheritedMonthlyFee = previousInactiveEnrollment?.monthlyFee ?? undefined

    const session = await getServerSession(authOptions)

    let enrollment
    if (existingEnrollment && !existingEnrollment.isActive) {
      // Reactivar inscripción existente
      enrollment = await prisma.classEnrollment.update({
        where: { id: existingEnrollment.id },
        data: { 
          isActive: true,
          deactivatedAt: null,
          enrolledAt: new Date(),
          ...(inheritedCutoffDay !== undefined ? { paymentCutoffDay: inheritedCutoffDay } : {}),
          ...(inheritedMonthlyFee !== undefined ? { monthlyFee: inheritedMonthlyFee } : {})
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
              user: { select: { email: true } }
            }
          },
          danceClass: {
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
    } else {
      // Crear nueva inscripción
      enrollment = await prisma.classEnrollment.create({
        data: {
          studentId: validatedData.studentId,
          classId: validatedData.classId,
          ...(inheritedCutoffDay !== undefined ? { paymentCutoffDay: inheritedCutoffDay } : {}),
          ...(inheritedMonthlyFee !== undefined ? { monthlyFee: inheritedMonthlyFee } : {})
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
              user: { select: { email: true } }
            }
          },
          danceClass: {
            include: {
              trainer: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      })
    }

    // Registrar transferencia implícita cuando el estudiante viene de otra clase del
    // mismo deporte, para que generateMonthlyPayments detecte que un pago ya realizado
    // en la clase anterior cubre la mensualidad de la nueva clase.
    if (previousInactiveEnrollment && session?.user?.id) {
      await prisma.studentTransfer.create({
        data: {
          studentId: validatedData.studentId,
          fromClassId: previousInactiveEnrollment.classId,
          toClassId: validatedData.classId,
          type: 'TRANSFER',
          transferredBy: parseInt(session.user.id),
          reason: 'Reinscripción: corte y tarifa heredados de la clase anterior'
        }
      })
    } else if (previousInactiveEnrollment && !session?.user?.id) {
      console.warn('[enrollments] reinscripción sin sesión: no se registró transferencia', {
        studentId: validatedData.studentId,
        fromClassId: previousInactiveEnrollment.classId,
        toClassId: validatedData.classId
      })
    }

    return NextResponse.json({ success: true, enrollment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error creating enrollment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar inscripción
export async function PUT(request: NextRequest) {
  try {
    const { id, action, ...updateData } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de inscripción requerido' },
        { status: 400 }
      )
    }

    let updatedEnrollment

    if (action === 'toggle-status') {
      // Toggle active status
             const currentEnrollment = await prisma.classEnrollment.findUnique({
         where: { id }
       })

       if (!currentEnrollment) {
         return NextResponse.json(
           { success: false, error: 'Inscripción no encontrada' },
           { status: 404 }
         )
       }

       updatedEnrollment = await prisma.classEnrollment.update({
         where: { id },
         data: { isActive: !currentEnrollment.isActive },
         include: {
           student: true,
           danceClass: {
             include: {
               trainer: true,
               location: true
             }
           }
         }
       })
         } else {
       // Update enrollment data
       updatedEnrollment = await prisma.classEnrollment.update({
         where: { id },
         data: updateData,
         include: {
           student: true,
           danceClass: {
             include: {
               trainer: true,
               location: true
             }
           }
         }
       })
     }

    return NextResponse.json({
      success: true,
      enrollment: updatedEnrollment
    })
  } catch (error) {
    console.error('Error updating enrollment:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Retirar inscripción (soft delete: se desactiva, no se elimina físicamente,
// para preservar el historial y la cadena de transferencias/cobros)
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de inscripción requerido' },
        { status: 400 }
      )
    }

    const session = await getServerSession(authOptions)

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id }
    })

    if (!enrollment) {
      return NextResponse.json(
        { success: false, error: 'Inscripción no encontrada' },
        { status: 404 }
      )
    }

    // Soft-delete + registro de la baja en la línea temporal de clases del estudiante.
    await prisma.$transaction(async (tx) => {
      await tx.classEnrollment.update({
        where: { id },
        data: { isActive: false, deactivatedAt: new Date() }
      })

      await tx.studentTransfer.create({
        data: {
          studentId: enrollment.studentId,
          fromClassId: enrollment.classId,
          toClassId: null,
          type: 'WITHDRAWAL',
          transferredBy: session?.user?.id ? parseInt(session.user.id) : null,
          reason: 'Retiro manual de la clase'
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Estudiante retirado de la clase correctamente'
    })
  } catch (error) {
    console.error('Error deleting enrollment:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 