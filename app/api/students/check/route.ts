import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentNumber = searchParams.get('documentNumber')

    if (!documentNumber) {
      return NextResponse.json({
        success: false,
        error: 'El número de documento es requerido'
      }, { status: 400 })
    }

    // Buscar estudiante por número de documento
    const student = await prisma.student.findUnique({
      where: { id: documentNumber },
      select: {
        id: true,
        name: true
      }
    })

    return NextResponse.json({
      success: true,
      exists: !!student,
      student: student || null
    })

  } catch (error) {
    console.error('Error checking student:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
} 