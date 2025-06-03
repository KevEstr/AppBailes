import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { WhatsAppService } from "@/lib/whatsapp"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    let student
    
    // Si se proporciona un studentId (cédula), usarlo para buscar el estudiante
    if (data.studentId) {
      const studentId = parseInt(data.studentId)
      if (!studentId || studentId <= 0) {
        return NextResponse.json({ 
          error: "ID de estudiante (cédula) debe ser un número válido" 
        }, { status: 400 })
      }
      
      student = await prisma.student.findUnique({
        where: { id: studentId },
      })
      
      if (!student) {
        return NextResponse.json({ 
          error: "Estudiante no encontrado con esa cédula" 
        }, { status: 404 })
      }
    } else {
      // Buscar estudiante por teléfono o nombre
      student = await prisma.student.findFirst({
        where: {
          OR: [{ phone: data.phone }, { name: data.studentName }],
        },
      })

      if (!student) {
        return NextResponse.json({ 
          error: "Estudiante no encontrado. Debe crear el estudiante primero con su cédula." 
        }, { status: 404 })
      }
    }

    // Convertir método de pago
    const paymentMethodMap: Record<string, string> = {
      efectivo: 'CASH',
      transferencia: 'TRANSFER',
      tarjeta: 'CARD',
    }

    const paymentMethod = paymentMethodMap[data.paymentMethod] || 'CASH'

    // Crear recibo
    const receipt = await prisma.receipt.create({
      data: {
        studentId: student.id,
        amount: Number.parseFloat(data.amount),
        concept: data.concept,
        paymentMethod: paymentMethod as any,
        promotion: data.promotion !== "none" ? data.promotion : null,
        notes: data.notes,
      },
    })

    // Enviar WhatsApp
    const whatsappService = WhatsAppService.getInstance()
    const message = whatsappService.generateReceiptMessage(
      student.name,
      Number.parseFloat(data.amount),
      data.concept,
      data.paymentMethod,
      data.promotion,
    )

    const whatsappSent = await whatsappService.sendMessage({
      to: student.phone,
      message,
      type: "receipt",
    })

    // Log del estado del envío
    if (whatsappSent) {
      console.log(`✅ Recibo procesado para ${student.name} - Monto: $${data.amount}`)
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
