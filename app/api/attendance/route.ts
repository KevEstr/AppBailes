import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Convertir el status del frontend al enum de Prisma
    const statusMap: Record<string, string> = {
      present: 'PRESENT',
      late: 'LATE',
      absent: 'ABSENT',
      change_request: 'CHANGE_REQUEST',
    }

    const status = statusMap[data.status]
    if (!status) {
      return NextResponse.json({ error: "Estado de asistencia inválido" }, { status: 400 })
    }

    if (!data.sessionId) {
      return NextResponse.json({ error: "ID de sesión es requerido" }, { status: 400 })
    }

    // Verificar que la sesión existe y está activa
    const session = await prisma.classSession.findUnique({
      where: { id: data.sessionId },
      include: {
        danceClass: {
          include: {
            enrollments: {
              where: { studentId: data.studentId, isActive: true }
            }
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 })
    }

    // Verificar que el estudiante esté inscrito en la clase
    if (session.danceClass.enrollments.length === 0) {
      return NextResponse.json({ 
        error: "El estudiante no está inscrito en esta clase" 
      }, { status: 400 })
    }

    // Verificar si ya existe una asistencia para esta sesión
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: data.studentId,
        sessionId: data.sessionId,
      },
    })

    let attendance
    if (existingAttendance) {
      // Actualizar asistencia existente
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: status as any,
          notes: data.notes,
        },
        include: {
          student: true,
          session: {
            include: {
              danceClass: true
            }
          }
        }
      })
    } else {
      // Crear nueva asistencia
      attendance = await prisma.attendance.create({
        data: {
          studentId: data.studentId,
          sessionId: data.sessionId,
          status: status as any,
          notes: data.notes,
          date: new Date(data.timestamp || Date.now()),
        },
        include: {
          student: true,
          session: {
            include: {
              danceClass: true
            }
          }
        }
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('sessionId')
    const classId = url.searchParams.get('classId')
    const date = url.searchParams.get('date')

    let whereCondition: any = {}

    if (sessionId) {
      whereCondition.sessionId = sessionId
    } else if (classId && date) {
      // Buscar asistencias por clase y fecha
      const targetDate = new Date(date)
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      const sessions = await prisma.classSession.findMany({
        where: {
          classId,
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })

      if (sessions.length > 0) {
        whereCondition.sessionId = {
          in: sessions.map((s: { id: string }) => s.id)
        }
      } else {
        // No hay sesiones para esa fecha
        return NextResponse.json({ attendances: [] })
      }
    } else {
      // Sin filtros específicos, obtener asistencias de hoy
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      whereCondition.date = {
        gte: today,
        lt: tomorrow,
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: whereCondition,
      include: {
        student: true,
        session: {
          include: {
            danceClass: true
          }
        }
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
