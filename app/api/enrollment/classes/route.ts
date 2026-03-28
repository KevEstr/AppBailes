import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport') // 'DANCE' or 'VOLLEYBALL'
    const trainerId = searchParams.get('trainerId')
    const locationId = searchParams.get('locationId')

    let whereClause: any = {
      isActive: true
    }

    if (sport === 'DANCE') {
      whereClause.sport = 'DANCE'
    } else if (sport === 'VOLLEYBALL') {
      whereClause.sport = 'VOLLEYBALL'
    }

    if (trainerId) {
      whereClause.trainerId = parseInt(trainerId)
    }

    if (locationId) {
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
        {
          trainer: {
            name: 'asc'
          }
        },
        {
          name: 'asc'
        }
      ]
    })

    const formattedClasses = classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      sport: cls.sport,
      level: cls.level,
      capacity: cls.capacity,
      price: cls.price,
      trainer: {
        id: cls.trainer.id,
        name: cls.trainer.name,
        email: cls.trainer.user?.email || null
      },
      location: cls.location ? {
        id: cls.location.id,
        name: cls.location.name,
        address: cls.location.address
      } : undefined,
      schedules: cls.schedules
    }))

    return NextResponse.json({
      success: true,
      classes: formattedClasses
    })

  } catch (error) {
    console.error('Error fetching classes:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
} 