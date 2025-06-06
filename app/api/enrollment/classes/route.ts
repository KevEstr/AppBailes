import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'dance' or 'sports'
    const trainerId = searchParams.get('trainerId')
    const locationId = searchParams.get('locationId')

    let whereClause: any = {
      isActive: true
    }

    if (type === 'dance') {
      whereClause.type = 'DANCE'
    } else if (type === 'sports') {
      whereClause.type = 'SPORTS'
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
            name: true
          }
        },
        location: {
          select: {
            id: true,
            name: true
          }
        },
        schedules: {
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true
          }
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
      trainer: cls.trainer.name,
      trainerId: cls.trainerId,
      type: cls.type,
      location: cls.location?.name,
      locationId: cls.locationId,
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
  } finally {
    await prisma.$disconnect()
  }
} 