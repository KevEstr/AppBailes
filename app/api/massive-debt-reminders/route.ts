import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { WhatsAppService } from "@/lib/whatsapp"

export async function POST() {
  try {
    const debts = await prisma.debt.findMany({
      where: {
        isPaid: false,
      },
      include: {
        student: true,
      },
    })

    if (debts.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No hay deudas pendientes",
      })
    }

    const whatsappService = WhatsAppService.getInstance()
    let sentCount = 0

    // Enviar recordatorio a cada estudiante con deuda
    for (const debt of debts) {
      const today = new Date()
      const dueDate = new Date(debt.dueDate)
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

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
        sentCount++
        // Actualizar fecha del último recordatorio
        await prisma.debt.update({
          where: { id: debt.id },
          data: { lastReminder: new Date() },
        })
      }

      // Delay entre mensajes
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      success: true,
      count: sentCount,
      total: debts.length,
      message: `${sentCount} recordatorios enviados exitosamente`,
    })
  } catch (error) {
    console.error("Error sending massive debt reminders:", error)
    return NextResponse.json({ error: "Error al enviar recordatorios masivos" }, { status: 500 })
  }
}
