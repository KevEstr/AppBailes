import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const createLocationSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  address: z.string().optional()
})

// GET - Obtener todas las ubicaciones
export async function GET() {
  try {
    const locations = await prisma.sportLocation.findMany({
      select: {
        id: true,
        name: true,
        address: true,
        _count: {
          select: {
            classes: {
              where: {
                isActive: true
              }
            }
          }
        }
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

// POST - Crear nueva ubicación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createLocationSchema.parse(body)

    // Verificar que no exista una ubicación con el mismo nombre
    const existingLocation = await prisma.sportLocation.findFirst({
      where: {
        name: {
          equals: validatedData.name,
          mode: 'insensitive'
        }
      }
    })

    if (existingLocation) {
      return NextResponse.json({
        success: false,
        error: 'Ya existe una ubicación con ese nombre'
      }, { status: 400 })
    }

    const newLocation = await prisma.sportLocation.create({
      data: {
        name: validatedData.name,
        address: validatedData.address
      },
      select: {
        id: true,
        name: true,
        address: true
      }
    })

    return NextResponse.json({ 
      success: true, 
      location: newLocation 
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Datos inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error creating location:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 