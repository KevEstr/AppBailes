import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

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
    page = parseInt(searchParams.get('page') || '1')
    limit = parseInt(searchParams.get('limit') || '10')
    search = searchParams.get('search')

    console.log('📊 Parámetros recibidos:', { status, page, limit, search })

    // Validar y ajustar parámetros de paginación
    validPage = Math.max(1, page)
    validLimit = Math.min(50, Math.max(1, limit)) // Máximo 50 registros por página
    skip = (validPage - 1) * validLimit
    
    console.log('✅ Parámetros validados:', { validPage, validLimit, skip })

    // Construir consulta base
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
    const [enrollments, total] = await Promise.all([
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
      })
    ])
    
    console.log('✅ Consultas completadas:', { 
      enrollmentsCount: enrollments.length, 
      totalCount: total 
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

    let enrollment
    if (existingEnrollment && !existingEnrollment.isActive) {
      // Reactivar inscripción existente
      enrollment = await prisma.classEnrollment.update({
        where: { id: existingEnrollment.id },
        data: { 
          isActive: true,
          enrolledAt: new Date()
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
          classId: validatedData.classId
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

// DELETE - Cancelar inscripción
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de inscripción requerido' },
        { status: 400 }
      )
    }

         await prisma.classEnrollment.delete({
       where: { id }
     })

    return NextResponse.json({
      success: true,
      message: 'Inscripción eliminada correctamente'
    })
  } catch (error) {
    console.error('Error deleting enrollment:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 