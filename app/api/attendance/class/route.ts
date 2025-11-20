import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'
import { z } from 'zod'

const attendanceSchema = z.object({
  studentId: z.string(),
  classId: z.string(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'CHANGE_REQUEST']),
  notes: z.string().optional()
})

// POST - Marcar asistencia para una clase específica
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = attendanceSchema.parse(body)

    // Verificar que la clase existe y está activa
    const classRecord = await prisma.class.findUnique({
      where: { id: validatedData.classId },
      include: { trainer: true }
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      )
    }

    if (!classRecord.isActive) {
      return NextResponse.json(
        { error: 'La clase no está activa para tomar asistencia' },
        { status: 400 }
      )
    }

    // Verificar si ya existe una asistencia para este estudiante en esta clase
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: validatedData.studentId,
        classId: validatedData.classId
      }
    })

    let attendance
    if (existingAttendance) {
      // Actualizar asistencia existente
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: validatedData.status,
          notes: validatedData.notes
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              group: true
            }
          },
          class: {
            select: {
              id: true,
              name: true,
              group: true
            }
          }
        }
      })
    } else {
      // Crear nueva asistencia
      attendance = await prisma.attendance.create({
        data: {
          studentId: validatedData.studentId,
          classId: validatedData.classId,
          status: validatedData.status,
          notes: validatedData.notes
        },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              group: true
            }
          },
          class: {
            select: {
              id: true,
              name: true,
              group: true
            }
          }
        }
      })
    }

    return NextResponse.json({ 
      success: true, 
      attendance,
      message: existingAttendance ? 'Asistencia actualizada' : 'Asistencia registrada'
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error recording attendance:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// GET - Obtener asistencias de una clase específica
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const classId = url.searchParams.get('classId')

    if (!classId) {
      return NextResponse.json(
        { error: 'classId es requerido' },
        { status: 400 }
      )
    }

    const attendances = await prisma.attendance.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            group: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ success: true, attendances })
  } catch (error) {
    console.error('Error fetching class attendances:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 