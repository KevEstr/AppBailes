import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const createEnrollmentSchema = z.object({
  studentId: z.string().min(1, 'ID de estudiante requerido'),
  classId: z.string().min(1, 'ID de clase requerido')
})

// GET - Obtener inscripciones
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const studentId = url.searchParams.get('studentId')
    const classId = url.searchParams.get('classId')
    const isActive = url.searchParams.get('active') !== 'false'

    let where: any = { isActive }

    if (studentId) {
      where.studentId = studentId
    }

    if (classId) {
      where.classId = classId
    }

    const enrollments = await prisma.classEnrollment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            hasDebt: true
          }
        },
        danceClass: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true
              }
            },
            schedules: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: [
        { enrolledAt: 'desc' }
      ]
    })

    return NextResponse.json({ success: true, enrollments })
  } catch (error) {
    console.error('Error fetching enrollments:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
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

// DELETE - Cancelar inscripción
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const enrollmentId = url.searchParams.get('id')
    const studentId = url.searchParams.get('studentId')
    const classId = url.searchParams.get('classId')
    
    if (!enrollmentId && (!studentId || !classId)) {
      return NextResponse.json({ 
        error: 'ID de inscripción o combinación studentId/classId requeridos' 
      }, { status: 400 })
    }

    let where: any = {}
    if (enrollmentId) {
      where.id = enrollmentId
    } else {
      where.studentId_classId = {
        studentId: studentId!,
        classId: classId!
      }
    }

    const cancelledEnrollment = await prisma.classEnrollment.update({
      where,
      data: { isActive: false },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        },
        danceClass: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ success: true, enrollment: cancelledEnrollment })
  } catch (error) {
    console.error('Error cancelling enrollment:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 