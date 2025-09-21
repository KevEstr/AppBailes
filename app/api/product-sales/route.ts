import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

// Función auxiliar para procesar venta de producto simple
async function processSimpleProductSale(tx: any, product: any, quantity: number, saleId: number, userId: number) {
  const currentStock = product.stock || 0
  const newStock = currentStock - quantity
  
  // Verificar si se permite stock negativo (por defecto se permite)
  if (newStock < 0 && product.allowNegativeStock === false) {
    throw new Error("INSUFFICIENT_STOCK")
  }

  await tx.product.update({
    where: { id: product.id },
    data: { stock: newStock }
  })

  // Registrar movimiento de inventario
  await tx.inventoryMovement.create({
    data: {
      productId: product.id,
      movementType: "SALE",
      quantity: -quantity,
      reason: "Venta de producto",
      reference: `VENTA-${saleId}`,
      notes: `Venta de ${quantity} unidades`,
      processedBy: userId
    }
  })
}

// Función auxiliar para procesar venta de producto compuesto
async function processCompositeProductSale(tx: any, product: any, quantity: number, saleId: number, userId: number) {
  for (const ingredient of product.compositeIngredients) {
    const requiredQuantity = ingredient.quantity * quantity
    const currentIngredientStock = ingredient.ingredient.stock || 0
    const newStock = currentIngredientStock - requiredQuantity
    
    // Verificar si se permite stock negativo (por defecto se permite)
    if (newStock < 0 && ingredient.ingredient.allowNegativeStock === false) {
      throw new Error(`INSUFFICIENT_STOCK_INGREDIENT:${ingredient.ingredient.name}`)
    }

    await tx.product.update({
      where: { id: ingredient.ingredient.id },
      data: { stock: newStock }
    })

    // Registrar movimiento de inventario para cada ingrediente
    await tx.inventoryMovement.create({
      data: {
        productId: ingredient.ingredient.id,
        movementType: "SALE",
        quantity: -requiredQuantity,
        reason: "Venta de producto compuesto",
        reference: `VENTA-${saleId}`,
        notes: `Ingrediente para ${product.name} (${quantity} unidades)`,
        processedBy: userId
      }
    })
  }
}

// POST /api/product-sales - Crear una venta de producto (ADMIN, TEACHER)
// API unificada para todas las ventas de productos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const role = session.user.role
    if (role !== "ADMIN" && role !== "TEACHER") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const body = await request.json()
    const { productId, quantity, paymentMethod, notes } = body as { 
      productId?: number; 
      quantity?: number; 
      paymentMethod?: string;
      notes?: string 
    }

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 })
    }

    if (!paymentMethod || !["CASH", "TRANSFER"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 })
    }

    const userId = parseInt(session.user.id, 10)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      // Obtener producto con ingredientes si es compuesto
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: {
          compositeIngredients: {
            include: {
              ingredient: true
            }
          }
        }
      })
      
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND")
      }
      if (!product.isActive) {
        throw new Error("PRODUCT_INACTIVE")
      }

      const unitPrice = product.price
      const totalAmount = unitPrice * quantity

      // Crear registro de venta
      const sale = await tx.productSale.create({
        data: {
          productId,
          quantity,
          unitPrice,
          totalAmount,
          paymentMethod,
          notes: notes ?? null,
          processedBy: userId,
        },
      })

      // Actualizar inventario según el tipo de producto
      if (product.productType === "SIMPLE") {
        await processSimpleProductSale(tx, product, quantity, sale.id, userId)
      } else if (product.productType === "COMPOSITE") {
        await processCompositeProductSale(tx, product, quantity, sale.id, userId)
      }

      return { sale }
    })

    return NextResponse.json({
      success: true,
      sale: result.sale,
      message: "Venta registrada exitosamente",
    })
  } catch (error: any) {
    console.error("Error creating product sale:", error)
    if (error instanceof Error) {
      if (error.message === "PRODUCT_NOT_FOUND") {
        return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
      }
      if (error.message === "PRODUCT_INACTIVE") {
        return NextResponse.json({ error: "El producto está inactivo" }, { status: 400 })
      }
      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json({ error: "Stock insuficiente" }, { status: 400 })
      }
      if (error.message.startsWith("INSUFFICIENT_STOCK_INGREDIENT:")) {
        const ingredientName = error.message.split(":")[1]
        return NextResponse.json({ error: `Stock insuficiente para el ingrediente: ${ingredientName}` }, { status: 400 })
      }
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}


