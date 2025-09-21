import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// GET /api/admin/products/[id] - Obtener producto específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
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
      }
    })

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      product
    })
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// PUT /api/admin/products/[id] - Actualizar producto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, price, stock, imageUrl, category, productType, allowNegativeStock, isActive, ingredients } = body

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

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    // Actualizar producto con transacción para ingredientes
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // Preparar datos del producto
      const productData: any = {
        name,
        description,
        price: parseFloat(price),
        imageUrl,
        category,
        productType,
        allowNegativeStock: productType === "SIMPLE" 
          ? (allowNegativeStock ?? existingProduct.allowNegativeStock) 
          : false,
        isActive: isActive !== undefined ? isActive : existingProduct.isActive
      }

      // Solo incluir stock para productos simples
      if (productType === "SIMPLE") {
        productData.stock = parseFloat(stock)
      } else {
        // Para productos compuestos, establecer stock como null
        productData.stock = null
      }

      const product = await tx.product.update({
        where: { id: productId },
        data: productData
      })

      // Si es un producto compuesto, actualizar ingredientes
      if (productType === "COMPOSITE") {
        // Eliminar ingredientes existentes
        await tx.productIngredient.deleteMany({
          where: { compositeProductId: productId }
        })

        // Crear nuevos ingredientes si se proporcionan
        if (ingredients && ingredients.length > 0) {
          await tx.productIngredient.createMany({
            data: ingredients.map((ingredient: any) => ({
              compositeProductId: productId,
              ingredientId: parseInt(ingredient.ingredientId),
              quantity: parseFloat(ingredient.quantity),
              unit: ingredient.unit || null
            }))
          })
        }
      } else {
        // Si cambia de compuesto a simple, eliminar ingredientes
        await tx.productIngredient.deleteMany({
          where: { compositeProductId: productId }
        })
      }

      return product
    })

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: "Producto actualizado exitosamente"
    })
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/products/[id] - Eliminar producto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const productId = parseInt(params.id)
    if (isNaN(productId)) {
      return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 })
    }

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!existingProduct) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
    }

    // Eliminar producto
    await prisma.product.delete({
      where: { id: productId }
    })

    return NextResponse.json({
      success: true,
      message: "Producto eliminado exitosamente"
    })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
