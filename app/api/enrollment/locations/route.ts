import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')

    if (!sport || sport !== 'VOLLEYBALL') {
      return NextResponse.json({
        success: false,
        error: 'Este endpoint es solo para ubicaciones de voleibol'
      }, { status: 400 })
    }

    // Obtener ubicaciones únicas donde hay clases de voleibol
    const locations = await prisma.sportLocation.findMany({
      where: {
        classes: {
          some: {
            sport: 'VOLLEYBALL',
            isActive: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        address: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({
      success: true,
      locations
    })

  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 