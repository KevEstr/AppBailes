import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/inventory/movements/history - Obtener historial de movimientos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const movementType = searchParams.get("movementType") || ""
    const productId = searchParams.get("productId") || ""
    const dateFrom = searchParams.get("dateFrom") || ""
    const dateTo = searchParams.get("dateTo") || ""

    const skip = (page - 1) * limit

    // Construir filtros de búsqueda
    const where: any = {}
    
    if (search) {
      where.OR = [
        { product: { name: { contains: search, mode: "insensitive" } } },
        { reason: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } }
      ]
    }

    if (movementType && movementType !== "all") {
      where.movementType = movementType
    }

    if (productId && productId !== "all") {
      where.productId = parseInt(productId)
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        // Colombia (UTC-5) start of day to match local expectations
        where.createdAt.gte = new Date(dateFrom + "T00:00:00-05:00")
      }
      if (dateTo) {
        // Colombia (UTC-5) end of day to include the full day
        where.createdAt.lte = new Date(dateTo + "T23:59:59-05:00")
      }
    }

    // Obtener movimientos con paginación
    const [movements, totalCount] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              category: true,
              productType: true
            }
          },
          user: {
            select: {
              id: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.inventoryMovement.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      movements,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error("Error fetching inventory movements:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

