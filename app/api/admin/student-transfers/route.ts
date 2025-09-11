import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'

// GET - Obtener historial de transferencias de estudiantes
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const studentId = searchParams.get('studentId') || ''
    const fromClassId = searchParams.get('fromClassId') || ''
    const toClassId = searchParams.get('toClassId') || ''
    const transferredBy = searchParams.get('transferredBy') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const offset = (page - 1) * limit

    // Construir filtros
    const whereClause: any = {}

    // Filtro por búsqueda general
    if (search) {
      whereClause.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { id: { contains: search, mode: 'insensitive' } } },
        { fromClass: { name: { contains: search, mode: 'insensitive' } } },
        { toClass: { name: { contains: search, mode: 'insensitive' } } },
        { user: { student: { name: { contains: search, mode: 'insensitive' } } } },
        { user: { trainer: { name: { contains: search, mode: 'insensitive' } } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { reason: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Filtros específicos
    if (studentId) {
      whereClause.studentId = studentId
    }

    if (fromClassId) {
      whereClause.fromClassId = parseInt(fromClassId)
    }

    if (toClassId) {
      whereClause.toClassId = parseInt(toClassId)
    }

    if (transferredBy) {
      whereClause.transferredBy = parseInt(transferredBy)
    }

    // Filtro por rango de fechas
    if (dateFrom || dateTo) {
      whereClause.transferredAt = {}
      if (dateFrom) {
        // Crear fecha en zona horaria de Colombia para evitar problemas de conversión
        whereClause.transferredAt.gte = new Date(`${dateFrom}T00:00:00.000-05:00`)
      }
      if (dateTo) {
        // Crear fecha en zona horaria de Colombia para evitar problemas de conversión
        whereClause.transferredAt.lte = new Date(`${dateTo}T23:59:59.999-05:00`)
      }
    }

    // Ejecutar consultas en paralelo
    const [transfers, total] = await Promise.all([
      prisma.studentTransfer.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatar: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          },
          fromClass: {
            select: {
              id: true,
              name: true,
              sport: true,
              level: true,
              trainer: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          toClass: {
            select: {
              id: true,
              name: true,
              sport: true,
              level: true,
              trainer: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              student: {
                select: {
                  name: true
                }
              },
              trainer: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          transferredAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.studentTransfer.count({
        where: whereClause
      })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      transfers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching student transfers:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
