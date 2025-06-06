import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obtener clase específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const danceClass = await prisma.danceClass.findUnique({
      where: { id: parseInt(id) },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        schedules: {
          where: { isActive: true },
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        },
        sessions: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            attendances: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        enrollments: {
          where: { isActive: true },
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
            }
          }
        },
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

    return NextResponse.json({ success: true, class: danceClass })
  } catch (error) {
    console.error('Error fetching class:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 