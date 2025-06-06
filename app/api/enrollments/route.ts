import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createEnrollmentSchema = z.object({
  studentId: z.number().int().positive('ID de estudiante debe ser un número positivo'),
  classId: z.number().int().positive('ID de clase debe ser un número positivo')
})

// GET - Obtener inscripciones
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search')

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (status && status !== 'all') {
      where.isActive = status === 'active'
    }
    
         if (search) {
       where.OR = [
         { student: { name: { contains: search, mode: 'insensitive' } } },
         { student: { phone: { contains: search, mode: 'insensitive' } } },
         { student: { email: { contains: search, mode: 'insensitive' } } }
       ]
     }

    const [enrollments, total] = await Promise.all([
      prisma.classEnrollment.findMany({
        where,
        include: {
          student: true,
          danceClass: {
            include: {
              trainer: true,
              location: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.classEnrollment.count({ where })
    ])

    return NextResponse.json({
      success: true,
      enrollments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
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
    const existingEnrollment = await prisma.enrollment.findUnique({
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
      enrollment = await prisma.enrollment.update({
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
              email: true,
              phone: true
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
      enrollment = await prisma.enrollment.create({
        data: {
          studentId: validatedData.studentId,
          classId: validatedData.classId
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
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