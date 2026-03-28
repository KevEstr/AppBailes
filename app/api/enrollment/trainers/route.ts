import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = searchParams.get('sport')

    if (!sport || sport !== 'DANCE') {
      return NextResponse.json({
        success: false,
        error: 'Este endpoint es solo para profesores de baile'
      }, { status: 400 })
    }

    // Obtener profesores únicos de clases de baile
    const trainers = await prisma.trainer.findMany({
      where: {
        classes: {
          some: {
            sport: 'DANCE',
            isActive: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        user: {
          select: {
            email: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Formatear la respuesta para mantener compatibilidad con el frontend
    const formattedTrainers = trainers.map(trainer => ({
      id: trainer.id,
      name: trainer.name,
      email: trainer.user?.email || null
    }))

    return NextResponse.json({
      success: true,
      trainers: formattedTrainers
    })

  } catch (error) {
    console.error('Error fetching trainers:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
} 