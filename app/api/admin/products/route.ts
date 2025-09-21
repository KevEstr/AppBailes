import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/products - Obtener productos con paginación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const category = searchParams.get("category") || ""
    const active = searchParams.get("active")
    const stock = searchParams.get("stock") // LOW | OUT

    const skip = (page - 1) * limit

    // Construir filtros de búsqueda
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } }
      ]
    }

    if (category && category !== "all") {
      where.category = category
    }

    // Filtrar por estado activo si se especifica
    if (active === "true") {
      where.isActive = true
    } else if (active === "false") {
      where.isActive = false
    }

    // Filtrar por stock si se especifica
    if (stock === "LOW") {
      // Menor a 10 y mayor a 0
      where.stock = { gt: 0, lt: 10 }
    } else if (stock === "OUT") {
      where.stock = 0
    }

    // Obtener productos con paginación e ingredientes
    const productDelegate = (prisma as any).product
    const [products, totalCount] = await Promise.all([
      productDelegate.findMany({
        where,
        include: {
          compositeIngredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  stock: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      productDelegate.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      products,
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
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// POST /api/admin/products - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, price, stock, imageUrl, category, productType, allowNegativeStock, ingredients } = body

    // Validaciones
    if (!name || !price || !category || !productType) {
      return NextResponse.json(
        { error: "Todos los campos obligatorios deben estar presentes" },
        { status: 400 }
      )
    }

    if (price <= 0) {
      return NextResponse.json(
        { error: "El precio debe ser mayor a 0" },
        { status: 400 }
      )
    }

    // Solo validar stock para productos simples
    if (productType === "SIMPLE") {
      if (stock === undefined || stock < 0) {
        return NextResponse.json(
          { error: "El stock es obligatorio y no puede ser negativo para productos simples" },
          { status: 400 }
        )
      }
    }

    // Crear producto con transacción para ingredientes
    const result = await prisma.$transaction(async (tx) => {
      // Preparar datos del producto
      const productData: any = {
        name,
        description,
        price: parseFloat(price),
        imageUrl,
        category,
        productType,
        allowNegativeStock: productType === "SIMPLE" 
          ? (allowNegativeStock ?? true) 
          : false
      }

      // Solo incluir stock para productos simples
      if (productType === "SIMPLE") {
        productData.stock = parseFloat(stock)
      }

      const product = await tx.product.create({
        data: productData
      })

      // Si es un producto compuesto, crear los ingredientes
      if (productType === "COMPOSITE" && ingredients && ingredients.length > 0) {
        await tx.productIngredient.createMany({
          data: ingredients.map((ingredient: any) => ({
            compositeProductId: product.id,
            ingredientId: parseInt(ingredient.ingredientId),
            quantity: parseFloat(ingredient.quantity),
            unit: ingredient.unit || null
          }))
        })
      }

      return product
    })

    return NextResponse.json({
      success: true,
      product: result,
      message: "Producto creado exitosamente"
    })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
