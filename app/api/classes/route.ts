import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ClassSessionService } from '@/lib/class-session-service'

const prisma = new PrismaClient()

// 🕐 FUNCIÓN AUXILIAR: Detectar conflictos de horario
function hasTimeConflict(schedule1: any, schedule2: any): boolean {
  // Convertir horarios a minutos para comparación más fácil
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const start1 = timeToMinutes(schedule1.startTime)
  const end1 = timeToMinutes(schedule1.endTime)
  const start2 = timeToMinutes(schedule2.startTime)
  const end2 = timeToMinutes(schedule2.endTime)

  // Verificar si hay traslape
  // Los horarios se traslapan si:
  // - El inicio de uno está entre el inicio y fin del otro
  // - O si uno contiene completamente al otro
  return (start1 < end2 && end1 > start2)
}

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
    const excludeIdParam = url.searchParams.get('excludeId')
    const searchParam = url.searchParams.get('search')
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
    if (excludeIdParam) {
      where.id = { not: parseInt(excludeIdParam) }
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
              phone: true,
              isActive: true,
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
                  phone: true,
                  user: {
                    select: {
                      email: true,
                    },
                  },
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

    // 🚨 VALIDACIÓN DE CONFLICTOS DE HORARIO DEL ENTRENADOR
    for (const newSchedule of validatedData.schedules) {
      // Buscar clases activas del mismo entrenador en el mismo día
      const conflictingClasses = await prisma.danceClass.findMany({
        where: {
          trainerId: validatedData.trainerId,
          isActive: true,
          schedules: {
            some: {
              dayOfWeek: newSchedule.dayOfWeek,
              isActive: true
            }
          }
        },
        include: {
          schedules: {
            where: {
              dayOfWeek: newSchedule.dayOfWeek,
              isActive: true
            }
          }
        }
      })

      // Verificar traslape de horarios
      for (const existingClass of conflictingClasses) {
        for (const existingSchedule of existingClass.schedules) {
          if (hasTimeConflict(newSchedule, existingSchedule)) {
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
            return NextResponse.json({
              error: `❌ Conflicto de horarios`,
              details: `El entrenador ${trainer.name} ya tiene la clase "${existingClass.name}" los ${dayNames[newSchedule.dayOfWeek]} de ${existingSchedule.startTime} a ${existingSchedule.endTime}. El nuevo horario (${newSchedule.startTime} - ${newSchedule.endTime}) se traslapa con esta clase existente.`
            }, { status: 409 })
          }
        }
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
          create: validatedData.schedules.map(sch => ({ ...sch, isActive: true }))
        }
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            phone: true,
            isActive: true,
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
          where: { isActive: true }
        }
      }
    })

    // ✨ GENERAR SESIONES AUTOMÁTICAMENTE (solo 2 semanas iniciales)
    try {
      const sessionService = new ClassSessionService(prisma)
      const sessionResult = await sessionService.generateSessionsForClass({
        classId: newClass.id,
        schedules: validatedData.schedules.map(sch => ({ ...sch, isActive: true })),
        startDate: new Date(),
        weeksToGenerate: 2 // Generar solo 2 semanas iniciales, el cron job se encargará del resto
      })
      
      console.log(`✅ Sesiones iniciales generadas: ${sessionResult.totalSessions}`)
    } catch (sessionError) {
      console.error('⚠️  Error generando sesiones (la clase se creó exitosamente):', sessionError)
      // No fallar la creación de la clase si falla la generación de sesiones
    }

    return NextResponse.json({ 
      success: true, 
      class: newClass,
      message: 'Clase creada exitosamente y sesiones generadas automáticamente'
    })
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

    // 🚨 VALIDACIÓN DE CONFLICTOS DE HORARIO AL ACTUALIZAR
    if (validatedData.schedules && validatedData.trainerId) {
      // Obtener información del entrenador
      const trainer = await prisma.trainer.findUnique({
        where: { id: validatedData.trainerId }
      })

      if (!trainer) {
        return NextResponse.json(
          { error: 'Entrenador no encontrado' },
          { status: 404 }
        )
      }

      for (const newSchedule of validatedData.schedules) {
        // Buscar clases activas del mismo entrenador en el mismo día (excluyendo la clase actual)
        const conflictingClasses = await prisma.danceClass.findMany({
          where: {
            trainerId: validatedData.trainerId,
            isActive: true,
            id: { not: classId }, // Excluir la clase que se está editando
            schedules: {
              some: {
                dayOfWeek: newSchedule.dayOfWeek,
                isActive: true
              }
            }
          },
          include: {
            schedules: {
              where: {
                dayOfWeek: newSchedule.dayOfWeek,
                isActive: true
              }
            }
          }
        })

        // Verificar traslape de horarios
        for (const existingClass of conflictingClasses) {
          for (const existingSchedule of existingClass.schedules) {
            if (hasTimeConflict(newSchedule, existingSchedule)) {
              const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
              return NextResponse.json({
                error: `❌ Conflicto de horarios`,
                details: `El entrenador ${trainer.name} ya tiene la clase "${existingClass.name}" los ${dayNames[newSchedule.dayOfWeek]} de ${existingSchedule.startTime} a ${existingSchedule.endTime}. El nuevo horario (${newSchedule.startTime} - ${newSchedule.endTime}) se traslapa con esta clase existente.`
              }, { status: 409 })
            }
          }
        }
      }
    }

    const updatedClass = await prisma.danceClass.update({
      where: { id: classId },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        trainerId: validatedData.trainerId,
        locationId: validatedData.locationId,
        capacity: validatedData.capacity,
        price: validatedData.price,
        sport: validatedData.sport,
        modality: validatedData.modality,
        level: validatedData.level,
        ...(validatedData.schedules && {
          schedules: {
            deleteMany: {}, // Eliminar horarios existentes
            create: validatedData.schedules.map(sch => ({ ...sch, isActive: true })) // Crear nuevos horarios con isActive
          }
        })
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            phone: true,
            isActive: true,
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
          where: { isActive: true }
        }
      }
    })

    // Si se actualizaron los horarios, regenerar las sesiones
    if (validatedData.schedules) {
      try {
        // Primero eliminar las sesiones futuras existentes
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        await prisma.classSession.deleteMany({
          where: {
            classId: classId,
            date: {
              gte: today
            },
            // No eliminar sesiones que ya tienen asistencia
            attendances: {
              none: {}
            }
          }
        })

        // Luego generar nuevas sesiones (solo 2 semanas)
        const sessionService = new ClassSessionService(prisma)
        const sessionResult = await sessionService.generateSessionsForClass({
          classId: classId,
          schedules: validatedData.schedules.map(sch => ({ ...sch, isActive: true })),
          startDate: today,
          weeksToGenerate: 2 // Solo 2 semanas, el cron job mantendrá el buffer
        })
        
        console.log(`✅ Sesiones regeneradas automáticamente: ${sessionResult.totalSessions}`)
      } catch (sessionError) {
        console.error('⚠️ Error regenerando sesiones (la clase se actualizó exitosamente):', sessionError)
      }
    }

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