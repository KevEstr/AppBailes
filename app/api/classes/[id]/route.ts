import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// DELETE - Eliminar clase específica por ID (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = parseInt(params.id)
    
    if (!classId || classId <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'ID de clase debe ser un número válido' 
      }, { status: 400 })
    }

    // Verificar que la clase existe
    const existingClass = await prisma.danceClass.findUnique({
      where: { id: classId }
    })

    if (!existingClass) {
      return NextResponse.json({
        success: false,
        error: 'Clase no encontrada'
      }, { status: 404 })
    }

    // Verificar si hay estudiantes inscritos activos
    const activeEnrollments = await prisma.classEnrollment.count({
      where: {
        classId: classId,
        isActive: true
      }
    })

    if (activeEnrollments > 0) {
      return NextResponse.json({
        success: false,
        error: `No se puede eliminar la clase porque tiene ${activeEnrollments} estudiante(s) inscrito(s)`
      }, { status: 400 })
    }

    // Realizar soft delete
    const deletedClass = await prisma.danceClass.update({
      where: { id: classId },
      data: { 
        isActive: false,
        // También desactivar horarios
        schedules: {
          updateMany: {
            where: {},
            data: { isActive: false }
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Clase eliminada exitosamente',
      class: deletedClass 
    })

  } catch (error) {
    console.error('Error deleting class:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

// GET - Obtener clase específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const classId = parseInt(params.id)
    
    if (!classId || classId <= 0) {
      return NextResponse.json({ 
        success: false,
        error: 'ID de clase debe ser un número válido' 
      }, { status: 400 })
    }

    const danceClass = await prisma.danceClass.findUnique({
      where: { id: classId },
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
                    email: true
                  }
                }
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
      }
    })

    if (!danceClass) {
      return NextResponse.json({
        success: false,
        error: 'Clase no encontrada'
      }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      class: danceClass 
    })

  } catch (error) {
    console.error('Error fetching class:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
} 