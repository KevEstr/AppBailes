import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { WhatsAppService } from "@/lib/whatsapp"
import { PaymentMethod } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Buscar o crear estudiante
    let student = await prisma.student.findFirst({
      where: {
        OR: [{ phone: data.phone }, { name: data.studentName }],
      },
    })

    if (!student) {
      student = await prisma.student.create({
        data: {
          name: data.studentName,
          phone: data.phone,
          group: "Sin Grupo",
        },
      })
    }

    // Convertir método de pago
    const paymentMethodMap: Record<string, PaymentMethod> = {
      efectivo: PaymentMethod.CASH,
      transferencia: PaymentMethod.TRANSFER,
      tarjeta: PaymentMethod.CARD,
    }

    const paymentMethod = paymentMethodMap[data.paymentMethod] || PaymentMethod.CASH

    // Crear recibo
    const receipt = await prisma.receipt.create({
      data: {
        studentId: student.id,
        amount: Number.parseFloat(data.amount),
        concept: data.concept,
        paymentMethod,
        promotion: data.promotion !== "none" ? data.promotion : null,
        notes: data.notes,
      },
    })

    // Enviar WhatsApp
    const whatsappService = WhatsAppService.getInstance()
    const message = whatsappService.generateReceiptMessage(
      data.studentName,
      Number.parseFloat(data.amount),
      data.concept,
      data.paymentMethod,
      data.promotion,
    )

    const whatsappSent = await whatsappService.sendMessage({
      to: data.phone,
      message,
      type: "receipt",
    })

    // Log del estado del envío
    if (whatsappSent) {
      console.log(`✅ Recibo procesado para ${data.studentName} - Monto: $${data.amount}`)
    }

    // Actualizar recibo con estado de WhatsApp
    await prisma.receipt.update({
      where: { id: receipt.id },
      data: {
        whatsappSent,
        sentAt: whatsappSent ? new Date() : null,
      },
    })

    return NextResponse.json({
      success: true,
      receipt: {
        ...receipt,
        whatsappSent,
      },
      message: "Recibo enviado exitosamente por WhatsApp",
    })
  } catch (error) {
    console.error("Error creating receipt:", error)
    return NextResponse.json({ error: "Error al crear recibo" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const receipts = await prisma.receipt.findMany({
      include: {
        student: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    })

    return NextResponse.json({ receipts })
  } catch (error) {
    console.error("Error fetching receipts:", error)
    return NextResponse.json({ error: "Error al obtener recibos" }, { status: 500 })
  }
}
