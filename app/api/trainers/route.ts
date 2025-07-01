import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"

const prisma = new PrismaClient()

const createTrainerSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(1, 'El teléfono es requerido')
})

const updateTrainerSchema = createTrainerSchema.partial()

// GET - Obtener profesores filtrados por deporte, ubicación, nivel
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const sport = url.searchParams.get('sport')
    const locationId = url.searchParams.get('locationId')
    const level = url.searchParams.get('level')
    const active = url.searchParams.get('active') === 'true'

    const classWhere: any = {}
    if (sport && sport !== 'ALL') classWhere.sport = sport
    if (locationId && locationId !== 'ALL') classWhere.locationId = parseInt(locationId)
    if (level && level !== 'ALL') classWhere.level = level
    if (active) classWhere.isActive = true

    // Solo profesores con al menos una clase activa según los filtros
    const trainers = await prisma.trainer.findMany({
      where: {
        classes: {
          some: classWhere
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ success: true, trainers })
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
    const trainerIdParam = url.searchParams.get('id')
    
    if (!trainerIdParam) {
      return NextResponse.json({ error: 'ID de entrenador requerido' }, { status: 400 })
    }

    const trainerId = parseInt(trainerIdParam)
    if (!trainerId || trainerId <= 0) {
      return NextResponse.json({ 
        error: 'ID de entrenador debe ser un número válido' 
      }, { status: 400 })
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
    const trainerIdParam = url.searchParams.get('id')
    
    if (!trainerIdParam) {
      return NextResponse.json({ error: 'ID de entrenador requerido' }, { status: 400 })
    }

    const trainerId = parseInt(trainerIdParam)
    if (!trainerId || trainerId <= 0) {
      return NextResponse.json({ 
        error: 'ID de entrenador debe ser un número válido' 
      }, { status: 400 })
    }

    // Verificar si el entrenador tiene clases activas
    const activeClasses = await prisma.danceClass.count({
      where: { trainerId: trainerId, isActive: true }
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