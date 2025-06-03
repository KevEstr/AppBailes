import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const createSessionSchema = z.object({
  classId: z.string().min(1, 'ID de clase requerido'),
  date: z.string().min(1, 'Fecha requerida'),
  startTime: z.string().min(1, 'Hora de inicio requerida'),
  endTime: z.string().min(1, 'Hora de fin requerida'),
  notes: z.string().optional()
})

const updateSessionSchema = z.object({
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().optional()
})

// GET - Obtener sesiones
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const classId = url.searchParams.get('classId')
    const date = url.searchParams.get('date')
    const status = url.searchParams.get('status')
    const upcoming = url.searchParams.get('upcoming') === 'true'

    let where: any = {}

    if (classId) {
      where.classId = classId
    }

    if (date) {
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      where.date = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    if (status) {
      where.status = status
    }

    if (upcoming) {
      where.date = {
        gte: new Date()
      }
    }

    const sessions = await prisma.classSession.findMany({
      where,
      include: {
        danceClass: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true
              }
            },
            enrollments: {
              where: { isActive: true },
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true
                  }
                }
              }
            }
          }
        },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            attendances: true
          }
        }
      },
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' }
      ]
    })

    return NextResponse.json({ success: true, sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva sesión
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createSessionSchema.parse(body)

    // Verificar que la clase existe
    const danceClass = await prisma.danceClass.findUnique({
      where: { id: validatedData.classId }
    })

    if (!danceClass) {
      return NextResponse.json(
        { error: 'Clase no encontrada' },
        { status: 404 }
      )
    }

    // Crear las fechas completas
    const sessionDate = new Date(validatedData.date)
    const [startHour, startMinute] = validatedData.startTime.split(':')
    const [endHour, endMinute] = validatedData.endTime.split(':')

    const startDateTime = new Date(sessionDate)
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)

    const endDateTime = new Date(sessionDate)
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)

    const newSession = await prisma.classSession.create({
      data: {
        classId: validatedData.classId,
        date: sessionDate,
        startTime: startDateTime,
        endTime: endDateTime,
        notes: validatedData.notes
      },
      include: {
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

    return NextResponse.json({ success: true, session: newSession })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar sesión
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('id')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'ID de sesión requerido' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateSessionSchema.parse(body)

    const updatedSession = await prisma.classSession.update({
      where: { id: sessionId },
      data: validatedData,
      include: {
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

    return NextResponse.json({ success: true, session: updatedSession })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar sesión
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('id')
    
    if (!sessionId) {
      return NextResponse.json({ error: 'ID de sesión requerido' }, { status: 400 })
    }

    const cancelledSession = await prisma.classSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' }
    })

    return NextResponse.json({ success: true, session: cancelledSession })
  } catch (error) {
    console.error('Error cancelling session:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 