import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const debts = await prisma.debt.findMany({
      where: {
        isPaid: false,
      },
      include: {
        student: true,
      },
      orderBy: {
        dueDate: "asc",
      },
    })

    // Calcular días de retraso y formatear datos
    const formattedDebts = debts.map((debt) => {
      const today = new Date()
      const dueDate = new Date(debt.dueDate)
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

      return {
        id: debt.id,
        studentName: debt.student.name,
        avatar: debt.student.avatar,
        phone: debt.student.phone,
        amount: debt.amount,
        concept: debt.concept,
        daysOverdue,
        lastPayment: debt.student.updatedAt.toLocaleDateString("es-ES"),
      }
    })

    // Actualizar el estado hasDebt de los estudiantes
    const studentIds = debts.map((debt) => debt.studentId)
    await prisma.student.updateMany({
      where: {
        id: { in: studentIds },
      },
      data: {
        hasDebt: true,
      },
    })

    // Actualizar estudiantes sin deudas
    await prisma.student.updateMany({
      where: {
        id: { notIn: studentIds },
      },
      data: {
        hasDebt: false,
      },
    })

    return NextResponse.json({
      debts: formattedDebts,
      count: formattedDebts.length,
    })
  } catch (error) {
    console.error("Error fetching debts:", error)
    return NextResponse.json({ error: "Error al obtener deudas" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const debt = await prisma.debt.create({
      data: {
        studentId: data.studentId,
        amount: Number.parseFloat(data.amount),
        concept: data.concept,
        dueDate: new Date(data.dueDate),
      },
    })

    // Actualizar estado de deuda del estudiante
    await prisma.student.update({
      where: { id: data.studentId },
      data: { hasDebt: true },
    })

    return NextResponse.json({ debt })
  } catch (error) {
    console.error("Error creating debt:", error)
    return NextResponse.json({ error: "Error al crear deuda" }, { status: 500 })
  }
}
