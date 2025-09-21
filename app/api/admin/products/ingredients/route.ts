import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/products/ingredients - Obtener productos simples (ingredientes)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    // Construir filtros de búsqueda
    const where: any = {
      productType: "SIMPLE",
      isActive: true
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ]
    }

    // Obtener productos simples
    const ingredients = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        stock: true,
        category: true,
      },
      orderBy: {
        name: "asc"
      }
    })

    return NextResponse.json({
      success: true,
      ingredients
    })
  } catch (error) {
    console.error("Error fetching ingredients:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

