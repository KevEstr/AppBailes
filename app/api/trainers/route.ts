import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const createTrainerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'El teléfono es requerido')
})

const updateTrainerSchema = createTrainerSchema.partial()

// GET - Obtener entrenadores
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const isActive = url.searchParams.get('active') !== 'false'

    const trainers = await prisma.trainer.findMany({
      where: { isActive },
      include: {
        classes: {
          where: { isActive: true },
          include: {
            _count: {
              select: {
                enrollments: {
                  where: { isActive: true }
                }
              }
            }
          }
        },
        _count: {
          select: {
            classes: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ success: true, trainers })
  } catch (error) {
    console.error('Error fetching trainers:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear entrenador
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createTrainerSchema.parse(body)

    // Verificar si el email ya existe
    const existingTrainer = await prisma.trainer.findUnique({
      where: { email: validatedData.email }
    })

    if (existingTrainer) {
      return NextResponse.json(
        { error: 'Ya existe un entrenador con este email' },
        { status: 400 }
      )
    }

    // Verificar si el teléfono ya existe
    const existingPhone = await prisma.trainer.findUnique({
      where: { phone: validatedData.phone }
    })

    if (existingPhone) {
      return NextResponse.json(
        { error: 'Ya existe un entrenador con este teléfono' },
        { status: 400 }
      )
    }

    const newTrainer = await prisma.trainer.create({
      data: validatedData
    })

    return NextResponse.json({ success: true, trainer: newTrainer })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating trainer:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar entrenador
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const trainerId = url.searchParams.get('id')
    
    if (!trainerId) {
      return NextResponse.json({ error: 'ID de entrenador requerido' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateTrainerSchema.parse(body)

    // Verificar si el email ya existe en otro entrenador
    if (validatedData.email) {
      const existingTrainer = await prisma.trainer.findUnique({
        where: { email: validatedData.email }
      })

      if (existingTrainer && existingTrainer.id !== trainerId) {
        return NextResponse.json(
          { error: 'Ya existe un entrenador con este email' },
          { status: 400 }
        )
      }
    }

    // Verificar si el teléfono ya existe en otro entrenador
    if (validatedData.phone) {
      const existingPhone = await prisma.trainer.findUnique({
        where: { phone: validatedData.phone }
      })

      if (existingPhone && existingPhone.id !== trainerId) {
        return NextResponse.json(
          { error: 'Ya existe un entrenador con este teléfono' },
          { status: 400 }
        )
      }
    }

    const updatedTrainer = await prisma.trainer.update({
      where: { id: trainerId },
      data: validatedData
    })

    return NextResponse.json({ success: true, trainer: updatedTrainer })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating trainer:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar entrenador (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const trainerId = url.searchParams.get('id')
    
    if (!trainerId) {
      return NextResponse.json({ error: 'ID de entrenador requerido' }, { status: 400 })
    }

    // Verificar si el entrenador tiene clases activas
    const activeClasses = await prisma.danceClass.count({
      where: { trainerId, isActive: true }
    })

    if (activeClasses > 0) {
      return NextResponse.json(
        { 
          error: `No se puede eliminar el entrenador porque tiene ${activeClasses} clase(s) activa(s)` 
        },
        { status: 400 }
      )
    }

    const deletedTrainer = await prisma.trainer.update({
      where: { id: trainerId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true, trainer: deletedTrainer })
  } catch (error) {
    console.error('Error deleting trainer:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 