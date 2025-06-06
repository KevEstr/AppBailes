import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'dance' or 'sports'

    // Get trainers based on type
    let trainers
    if (type === 'dance') {
      trainers = await prisma.trainer.findMany({
        where: {
          isActive: true,
          classes: {
            some: {
              type: 'DANCE'
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
    } else if (type === 'sports') {
      trainers = await prisma.trainer.findMany({
        where: {
          isActive: true,
          classes: {
            some: {
              type: 'SPORTS'
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
    } else {
      trainers = await prisma.trainer.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true
        }
      })
    }

    return NextResponse.json({
      success: true,
      trainers
    })

  } catch (error) {
    console.error('Error fetching trainers:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 