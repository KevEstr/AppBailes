import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')
    const trainerId = searchParams.get('trainerId')
    const locationId = searchParams.get('locationId')

    if (!sport) {
      return NextResponse.json({
        success: false,
        error: 'El parámetro sport es requerido'
      }, { status: 400 })
    }

    let whereClause: any = {
      sport,
      isActive: true
    }

    // Para DANCE: filtrar por profesor
    if (sport === 'DANCE') {
      if (!trainerId) {
        return NextResponse.json({
          success: false,
          error: 'El parámetro trainerId es requerido para clases de baile'
        }, { status: 400 })
      }
      whereClause.trainerId = parseInt(trainerId)
    }

    // Para VOLLEYBALL: filtrar por ubicación
    if (sport === 'VOLLEYBALL') {
      if (!locationId) {
        return NextResponse.json({
          success: false,
          error: 'El parámetro locationId es requerido para clases de voleibol'
        }, { status: 400 })
      }
      whereClause.locationId = parseInt(locationId)
    }

    const classes = await prisma.danceClass.findMany({
      where: whereClause,
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        location: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        schedules: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true
          },
          where: {
            isActive: true
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        }
      },
      orderBy: [
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      classes
    })

  } catch (error) {
    console.error('Error fetching schedules:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 