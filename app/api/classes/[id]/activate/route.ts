import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

// POST - Activar una clase (iniciar la toma de asistencia)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const classId = id

    // Primero desactivar todas las clases activas
    await prisma.class.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Luego activar la clase seleccionada
    const activeClass = await prisma.class.update({
      where: { id: classId },
      data: { isActive: true },
      include: {
        trainer: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Clase activada para toma de asistencia',
      class: activeClass 
    })
  } catch (error) {
    console.error('Error activating class:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Desactivar una clase
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const classId = id

    const deactivatedClass = await prisma.class.update({
      where: { id: classId },
      data: { isActive: false }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Clase desactivada',
      class: deactivatedClass 
    })
  } catch (error) {
    console.error('Error deactivating class:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 