import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const enrollmentId = parseInt(id)

    if (isNaN(enrollmentId)) {
      return NextResponse.json(
        { error: 'ID de inscripción inválido' },
        { status: 400 }
      )
    }

    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: {
          include: {
            enrollmentData: true,
            debts: {
              where: { isPaid: false },
              orderBy: { dueDate: 'asc' }
            },
            receipts: {
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            attendances: {
              include: {
                session: {
                  include: {
                    danceClass: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              },
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        },
        danceClass: {
          include: {
            trainer: true,
            location: true,
            schedules: true
          }
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Inscripción no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      enrollment
    })
  } catch (error) {
    console.error('Error fetching enrollment details:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 