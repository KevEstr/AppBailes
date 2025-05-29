import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { WhatsAppService } from "@/lib/whatsapp"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const debt = await prisma.debt.findUnique({
      where: { id: data.debtId },
      include: { student: true },
    })

    if (!debt) {
      return NextResponse.json({ error: "Deuda no encontrada" }, { status: 404 })
    }

    // Calcular días de retraso
    const today = new Date()
    const dueDate = new Date(debt.dueDate)
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

    // Generar y enviar mensaje
    const whatsappService = WhatsAppService.getInstance()
    const message = whatsappService.generateDebtReminderMessage(
      debt.student.name,
      debt.amount,
      debt.concept,
      daysOverdue,
    )

    const sent = await whatsappService.sendMessage({
      to: debt.student.phone,
      message,
      type: "reminder",
    })

    if (sent) {
      console.log(`💰 Recordatorio de deuda enviado:`)
      console.log(`   👤 Estudiante: ${debt.student.name}`)
      console.log(`   💵 Monto: $${debt.amount}`)
      console.log(`   📅 Días de retraso: ${daysOverdue}`)
    }

    if (sent) {
      // Actualizar fecha del último recordatorio
      await prisma.debt.update({
        where: { id: debt.id },
        data: { lastReminder: new Date() },
      })
    }

    return NextResponse.json({
      success: sent,
      message: sent ? "Recordatorio enviado exitosamente" : "Error al enviar recordatorio",
    })
  } catch (error) {
    console.error("Error sending debt reminder:", error)
    return NextResponse.json({ error: "Error al enviar recordatorio" }, { status: 500 })
  }
}
