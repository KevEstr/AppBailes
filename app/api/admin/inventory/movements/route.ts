import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

// GET /api/admin/inventory/movements - Obtener movimientos de inventario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const productId = searchParams.get("productId")
    const movementType = searchParams.get("movementType")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const skip = (page - 1) * limit

    // Construir filtros
    const where: any = {}
    
    if (productId) {
      where.productId = parseInt(productId)
    }

    if (movementType) {
      where.movementType = movementType
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
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
              category: true
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

// POST /api/admin/inventory/movements - Crear movimientos de inventario (múltiples productos)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { movements, paymentMethod } = body

    // Validaciones
    if (!movements || !Array.isArray(movements) || movements.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un movimiento" },
        { status: 400 }
      )
    }

    // Validar cada movimiento
    for (const movement of movements) {
      const { productId, movementType, quantity, price, reason, reference, notes } = movement
      
      if (!productId || !movementType || quantity === undefined) {
        return NextResponse.json(
          { error: "Producto, tipo de movimiento y cantidad son obligatorios para todos los movimientos" },
          { status: 400 }
        )
      }

      if (quantity <= 0) {
        return NextResponse.json(
          { error: "La cantidad debe ser mayor a 0 para todos los movimientos" },
          { status: 400 }
        )
      }

      // Validar precio para entradas (movimientos positivos)
      if (quantity > 0 && price !== undefined && price < 0) {
        return NextResponse.json(
          { error: "El precio debe ser mayor o igual a 0 para entradas de inventario" },
          { status: 400 }
        )
      }
    }

    // Verificar que todos los productos existen
    const productIds = movements.map(m => parseInt(m.productId))
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json({ error: "Uno o más productos no fueron encontrados" }, { status: 404 })
    }

    // Crear movimientos y actualizar stock en transacción
    const result = await prisma.$transaction(async (tx) => {
      const createdMovements = []
      let totalPurchaseAmount = 0
      let hasPurchase = false
      
      for (const movement of movements) {
        const { productId, movementType, quantity, price, reason, reference, notes } = movement
        
        // Crear movimiento
        const createdMovement = await tx.inventoryMovement.create({
          data: {
            productId: parseInt(productId),
            movementType,
            quantity: parseFloat(quantity),
            price: price !== undefined ? parseFloat(price) : null,
            reason,
            reference,
            notes,
            processedBy: parseInt(session.user.id)
          }
        })

        // Actualizar stock del producto
        const product = products.find(p => p.id === parseInt(productId))
        if (product) {
          const currentStock = product.stock || 0
          const newStock = currentStock + parseFloat(quantity)
          
          // Verificar si se permite stock negativo
          if (newStock < 0 && !product.allowNegativeStock) {
            throw new Error(`No se permite stock negativo para el producto: ${product.name}`)
          }

          await tx.product.update({
            where: { id: parseInt(productId) },
            data: { stock: newStock }
          })
        }

        // Si es una entrada con motivo PURCHASE y tiene precio, acumular para el egreso
        if (movementType === "PURCHASE" && price !== undefined && price > 0) {
          totalPurchaseAmount += parseFloat(price)
          hasPurchase = true
        }

        createdMovements.push(createdMovement)
      }

      // Si hay compras y se proporcionó método de pago, crear egreso financiero
      if (hasPurchase && totalPurchaseAmount > 0 && paymentMethod) {
        // Obtener o crear el período financiero actual
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1

        let period = await tx.financialPeriod.findUnique({
          where: {
            year_month: {
              year: currentYear,
              month: currentMonth,
            },
          },
        })

        if (!period) {
          const startDate = new Date(currentYear, currentMonth - 1, 1)
          const endDate = new Date(currentYear, currentMonth, 0)
          
          period = await tx.financialPeriod.create({
            data: {
              year: currentYear,
              month: currentMonth,
              startDate,
              endDate,
            },
          })
        }

        // Crear la transacción financiera de egreso
        await tx.financialTransaction.create({
          data: {
            periodId: period.id,
            type: "EXPENSE",
            category: "PURCHASES", // Categoría para compras de inventario (temporal hasta migración)
            amount: totalPurchaseAmount,
            description: `Compra de inventario - ${movements.length} producto(s)`,
            reference: movements[0]?.reference || null,
            paymentMethod: paymentMethod,
            date: new Date(),
            studentId: null,
            relatedId: null,
            relatedType: "INVENTORY_PURCHASE",
          },
        })
      }

      return createdMovements
    })

    return NextResponse.json({
      success: true,
      movements: result,
      message: `${result.length} movimiento(s) de inventario registrado(s) exitosamente`
    })
  } catch (error) {
    console.error("Error creating inventory movement:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    )
  }
}
