import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"
    const studentIdParam = searchParams.get("student") || "all"

    // Calcular fechas según el período
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case "week":
        startDate.setDate(endDate.getDate() - 7)
        break
      case "month":
        startDate.setDate(endDate.getDate() - 30)
        break
      case "quarter":
        startDate.setDate(endDate.getDate() - 90)
        break
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
    }

    // Obtener asistencias
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (studentIdParam !== "all") {
      const studentId = parseInt(studentIdParam)
      if (studentId) {
        whereClause.studentId = studentId
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: true,
      },
      orderBy: {
        date: "asc",
      },
    })

    // Generar datos para el gráfico
    const chartData = []
    const days = period === "week" ? 7 : period === "month" ? 30 : 90

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })

      const dayAttendances = attendances.filter((att: any) => {
        const attDate = new Date(att.date)
        return attDate.toDateString() === date.toDateString()
      })

      chartData.push({
        date: dateStr,
        present: dayAttendances.filter((att: any) => att.status === 'PRESENT').length,
        late: dayAttendances.filter((att: any) => att.status === 'LATE').length,
        absent: dayAttendances.filter((att: any) => att.status === 'ABSENT').length,
      })
    }

    // Generar estadísticas por estudiante
    const students = await prisma.student.findMany({
      where: { isActive: true },
      include: {
        attendances: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    })

    const studentStats = students.map((student: any) => {
      const studentAttendances = student.attendances
      const totalClasses = studentAttendances.length
      const present = studentAttendances.filter((att: any) => att.status === 'PRESENT').length
      const late = studentAttendances.filter((att: any) => att.status === 'LATE').length
      const absent = studentAttendances.filter((att: any) => att.status === 'ABSENT').length
      const percentage = totalClasses > 0 ? Math.round((present / totalClasses) * 100) : 0

      return {
        id: student.id,
        name: student.name,
        avatar: student.avatar,
        totalClasses,
        present,
        late,
        absent,
        percentage,
      }
    })

    return NextResponse.json({
      chartData,
      studentStats,
    })
  } catch (error) {
    console.error("Error fetching attendance history:", error)
    return NextResponse.json({ error: "Error al obtener historial de asistencia" }, { status: 500 })
  }
}
