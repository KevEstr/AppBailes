import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

const createClassSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  trainerId: z.number().int().positive('El ID del entrenador debe ser un número positivo'),
  locationId: z.number().int().positive('El ID de la ubicación debe ser un número positivo').optional(),
  capacity: z.number().min(1, 'La capacidad debe ser mayor a 0').optional(),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0').optional(),
  sport: z.enum(['DANCE', 'VOLLEYBALL'], { 
    errorMap: () => ({ message: 'El deporte debe ser DANCE o VOLLEYBALL' })
  }),
  modality: z.string().optional(),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], {
    errorMap: () => ({ message: 'El nivel debe ser BEGINNER, INTERMEDIATE o ADVANCED' })
  }).optional(),
  schedules: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)')
  })).min(1, 'Al menos un horario es requerido')
})

const updateClassSchema = createClassSchema.partial()

// GET - Obtener todas las clases (paginado y filtrado)
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const isActive = url.searchParams.get('active') === 'true'
    const trainerIdParam = url.searchParams.get('trainerId')
    const sportParam = url.searchParams.get('sport')
    const locationIdParam = url.searchParams.get('locationId')
    const levelParam = url.searchParams.get('level')
    const pageParam = url.searchParams.get('page')
    const pageSizeParam = url.searchParams.get('pageSize')

    const page = pageParam ? parseInt(pageParam) : 1
    const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 6
    const skip = (page - 1) * pageSize
    const take = pageSize

    const where: any = {}
    if (isActive !== null) {
      where.isActive = isActive
    }
    if (trainerIdParam && trainerIdParam !== 'ALL') {
      where.trainerId = parseInt(trainerIdParam)
    }
    if (sportParam && sportParam !== 'ALL') {
      where.sport = sportParam
    }
    if (locationIdParam && locationIdParam !== 'ALL') {
      where.locationId = parseInt(locationIdParam)
    }
    if (levelParam && levelParam !== 'ALL') {
      where.level = levelParam
    }

    const [total, classes] = await Promise.all([
      prisma.danceClass.count({ where }),
      prisma.danceClass.findMany({
        where,
        skip,
        take,
        include: {
          trainer: {
            select: {
              id: true,
              name: true,
              email: true
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
            where: { isActive: true },
            orderBy: [
              { dayOfWeek: 'asc' },
              { startTime: 'asc' }
            ]
          },
          enrollments: {
            where: { isActive: true },
            include: {
              student: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          _count: {
            select: {
              enrollments: {
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
    ])

    return NextResponse.json({ success: true, classes, total, page, pageSize })
  } catch (error) {
    console.error('Error fetching classes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva clase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createClassSchema.parse(body)

    // Verificar que el entrenador existe
    const trainer = await prisma.trainer.findUnique({
      where: { id: validatedData.trainerId }
    })

    if (!trainer) {
      return NextResponse.json(
        { error: 'Entrenador no encontrado' },
        { status: 404 }
      )
    }

    // Si es voleibol, verificar que tenga ubicación
    if (validatedData.sport === 'VOLLEYBALL' && !validatedData.locationId) {
      return NextResponse.json(
        { error: 'La ubicación es requerida para clases de voleibol' },
        { status: 400 }
      )
    }

    // Si se proporciona locationId, verificar que la ubicación existe
    if (validatedData.locationId) {
      const location = await prisma.sportLocation.findUnique({
        where: { id: validatedData.locationId }
      })

      if (!location) {
        return NextResponse.json(
          { error: 'Ubicación no encontrada' },
          { status: 404 }
        )
      }
    }

    const newClass = await prisma.danceClass.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        trainerId: validatedData.trainerId,
        locationId: validatedData.locationId,
        capacity: validatedData.capacity || 20,
        price: validatedData.price,
        sport: validatedData.sport,
        modality: validatedData.modality,
        level: validatedData.level || 'BEGINNER',
        schedules: {
          create: validatedData.schedules
        }
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
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
          where: { isActive: true }
        }
      }
    })

    return NextResponse.json({ success: true, class: newClass })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating class:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PUT - Actualizar clase
export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const classIdParam = url.searchParams.get('id')
    
    if (!classIdParam) {
      return NextResponse.json({ error: 'ID de clase requerido' }, { status: 400 })
    }

    const classId = parseInt(classIdParam)
    if (!classId || classId <= 0) {
      return NextResponse.json({ 
        error: 'ID de clase debe ser un número válido' 
      }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateClassSchema.parse(body)

    const updatedClass = await prisma.danceClass.update({
      where: { id: classId },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        trainerId: validatedData.trainerId,
        capacity: validatedData.capacity,
        price: validatedData.price,
        sport: validatedData.sport,
        modality: validatedData.modality,
        level: validatedData.level,
        ...(validatedData.schedules && {
          schedules: {
            deleteMany: {}, // Eliminar horarios existentes
            create: validatedData.schedules // Crear nuevos horarios
          }
        })
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        schedules: {
          where: { isActive: true }
        }
      }
    })

    return NextResponse.json({ success: true, class: updatedClass })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating class:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar clase (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const classIdParam = url.searchParams.get('id')
    
    if (!classIdParam) {
      return NextResponse.json({ error: 'ID de clase requerido' }, { status: 400 })
    }

    const classId = parseInt(classIdParam)
    if (!classId || classId <= 0) {
      return NextResponse.json({ 
        error: 'ID de clase debe ser un número válido' 
      }, { status: 400 })
    }

    const deletedClass = await prisma.danceClass.update({
      where: { id: classId },
      data: { isActive: false }
    })

    return NextResponse.json({ success: true, class: deletedClass })
  } catch (error) {
    console.error('Error deleting class:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 