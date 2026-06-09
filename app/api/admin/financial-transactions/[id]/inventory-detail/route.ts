import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No autorizado", code: "UNAUTHORIZED" },
        { status: 401 }
      )
    }

    const { id } = await params
    const transactionId = Number(id)
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      return NextResponse.json(
        { error: "Transacción no encontrada", code: "TRANSACTION_NOT_FOUND" },
        { status: 404 }
      )
    }

    const transaction = await prisma.financialTransaction.findUnique({
      where: { id: transactionId },
      select: { id: true, relatedType: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Transacción no encontrada", code: "TRANSACTION_NOT_FOUND" },
        { status: 404 }
      )
    }

    const links = await prisma.financialTransactionInventoryMovement.findMany({
      where: { financialTransactionId: transactionId },
      include: {
        inventoryMovement: {
          include: {
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { inventoryMovementId: "asc" },
    })

    const isInventoryPurchase = transaction.relatedType === "INVENTORY_PURCHASE"

    if (links.length === 0 && !isInventoryPurchase) {
      return NextResponse.json(
        {
          error: "No aplica detalle de inventario para esta transacción",
          code: "INVENTORY_DETAIL_NOT_APPLICABLE",
        },
        { status: 404 }
      )
    }

    const items = links.map((link) => ({
      inventoryMovementId: link.inventoryMovementId,
      productId: link.inventoryMovement.productId,
      productName: link.inventoryMovement.product.name,
      quantity: link.inventoryMovement.quantity,
      price: link.inventoryMovement.price ?? 0,
      reference: link.inventoryMovement.reference,
      notes: link.inventoryMovement.notes,
    }))

    return NextResponse.json({
      items,
      legacy: isInventoryPurchase && items.length === 0,
      total: items.length,
    })
  } catch (error) {
    console.error("Error fetching inventory detail:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
