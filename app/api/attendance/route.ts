import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AttendanceStatus } from "@prisma/client"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Convertir el status del frontend al enum de Prisma
    const statusMap: Record<string, AttendanceStatus> = {
      present: AttendanceStatus.PRESENT,
      late: AttendanceStatus.LATE,
      absent: AttendanceStatus.ABSENT,
      change_request: AttendanceStatus.CHANGE_REQUEST,
    }

    const status = statusMap[data.status]
    if (!status) {
      return NextResponse.json({ error: "Estado de asistencia inválido" }, { status: 400 })
    }

    // Verificar si ya existe una asistencia para hoy
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: data.studentId,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    })

    let attendance
    if (existingAttendance) {
      // Actualizar asistencia existente
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status,
          notes: data.notes,
        },
      })
    } else {
      // Crear nueva asistencia
      attendance = await prisma.attendance.create({
        data: {
          studentId: data.studentId,
          status,
          notes: data.notes,
          date: new Date(data.timestamp),
        },
      })
    }

    return NextResponse.json({
      success: true,
      record: attendance,
      message: "Asistencia registrada exitosamente",
    })
  } catch (error) {
    console.error("Error registering attendance:", error)
    return NextResponse.json({ error: "Error al registrar asistencia" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        student: true,
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json({ attendances })
  } catch (error) {
    console.error("Error fetching attendances:", error)
    return NextResponse.json({ error: "Error al obtener asistencias" }, { status: 500 })
  }
}
