import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

// POST /api/product-sales - Crear una venta de producto (ADMIN, TEACHER)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
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

    const userId = parseInt(session.user.id as string, 10)
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: "Usuario inválido" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } })
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND")
      }
      if (!product.isActive) {
        throw new Error("PRODUCT_INACTIVE")
      }
      if (product.stock < quantity) {
        throw new Error("INSUFFICIENT_STOCK")
      }

      const unitPrice = product.price
      const totalAmount = unitPrice * quantity

      // Descontar stock
      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      })

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
    }
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}


