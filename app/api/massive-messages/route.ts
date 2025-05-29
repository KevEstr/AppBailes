import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { WhatsAppService } from "@/lib/whatsapp"
import { MessageType } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Convertir tipo de mensaje
    const messageTypeMap: Record<string, MessageType> = {
      payment_reminder: MessageType.PAYMENT_REMINDER,
      training_reminder: MessageType.TRAINING_REMINDER,
      absence_inquiry: MessageType.ABSENCE_INQUIRY,
      general: MessageType.GENERAL,
    }

    const messageType = messageTypeMap[data.type]
    if (!messageType) {
      return NextResponse.json({ error: "Tipo de mensaje inválido" }, { status: 400 })
    }

    // Obtener estudiantes según el grupo objetivo
    let students
    switch (data.targetGroup) {
      case "Todos los estudiantes":
        students = await prisma.student.findMany({
          where: { isActive: true },
        })
        break
      case "Estudiantes con deudas":
        students = await prisma.student.findMany({
          where: {
            isActive: true,
            hasDebt: true,
          },
        })
        break
      default:
        students = await prisma.student.findMany({
          where: {
            isActive: true,
            group: data.targetGroup,
          },
        })
        break
    }

    if (students.length === 0) {
      return NextResponse.json({ error: "No se encontraron estudiantes para el grupo seleccionado" }, { status: 400 })
    }

    // Crear registro del mensaje masivo
    const massiveMessage = await prisma.massiveMessage.create({
      data: {
        type: messageType,
        message: data.message,
        targetGroup: data.targetGroup,
        sentCount: 0,
        recipients: {
          connect: students.map((student) => ({ id: student.id })),
        },
      },
    })

    // Enviar mensajes por WhatsApp
    const whatsappService = WhatsAppService.getInstance()
    const phones = students.map((student) => student.phone)

    const result = await whatsappService.sendMassiveMessages(phones, data.message)

    console.log(`📊 Mensajes masivos procesados:`)
    console.log(`   ✅ Enviados: ${result.sent}`)
    console.log(`   ❌ Fallidos: ${result.failed}`)
    console.log(`   🎯 Grupo: ${data.targetGroup}`)

    // Actualizar contador de mensajes enviados
    await prisma.massiveMessage.update({
      where: { id: massiveMessage.id },
      data: {
        sentCount: result.sent,
      },
    })

    return NextResponse.json({
      success: true,
      count: result.sent,
      failed: result.failed,
      message: `${result.sent} mensajes enviados exitosamente`,
    })
  } catch (error) {
    console.error("Error sending massive messages:", error)
    return NextResponse.json({ error: "Error al enviar mensajes masivos" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const messages = await prisma.massiveMessage.findMany({
      include: {
        recipients: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching massive messages:", error)
    return NextResponse.json({ error: "Error al obtener mensajes masivos" }, { status: 500 })
  }
}
