import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/products/stats - Obtener estadísticas de productos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener estadísticas generales
    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      lowStockProducts,
      outOfStockProducts,
      totalStockValue,
      categoryStats
    ] = await Promise.all([
      // Total de productos
      prisma.product.count(),
      
      // Productos activos
      prisma.product.count({ where: { isActive: true } }),
      
      // Productos inactivos
      prisma.product.count({ where: { isActive: false } }),
      
      // Productos con stock bajo (menos de 10 unidades) - solo productos simples
      prisma.product.count({ where: { stock: { lt: 10 }, isActive: true, productType: "SIMPLE" } }),
      
      // Productos sin stock - solo productos simples
      prisma.product.count({ where: { stock: 0, isActive: true, productType: "SIMPLE" } }),
      
      // Valor total del inventario - solo productos simples
      prisma.product.findMany({
        where: { isActive: true, productType: "SIMPLE" },
        select: { price: true, stock: true }
      }).then(products => {
        return products.reduce((total, product) => {
          return total + (product.price * (product.stock || 0))
        }, 0)
      }),
      
      // Estadísticas por categoría - solo productos simples
      prisma.product.groupBy({
        by: ['category'],
        where: { isActive: true, productType: "SIMPLE" },
        _count: {
          id: true
        },
        _sum: {
          stock: true
        }
      })
    ])

    // Calcular estadísticas por categoría
    const categoryBreakdown = categoryStats.map(stat => ({
      category: stat.category,
      count: stat._count.id,
      totalStock: stat._sum.stock || 0
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalProducts,
        activeProducts,
        inactiveProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue: parseFloat(totalStockValue.toFixed(2)),
        categoryBreakdown
      }
    })
  } catch (error) {
    console.error("Error fetching product stats:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
