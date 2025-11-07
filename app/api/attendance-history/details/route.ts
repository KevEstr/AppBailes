import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentIdParam = searchParams.get("student")
    const classIdParam = searchParams.get("class") || "all"
    const customStartDate = searchParams.get("startDate")
    const customEndDate = searchParams.get("endDate")

    if (!studentIdParam || studentIdParam === "all") {
      return NextResponse.json(
        { error: "Se requiere un ID de estudiante" },
        { status: 400 }
      )
    }

    // studentId debe ser string según el esquema de Prisma
    const studentId = studentIdParam

    // Calcular fechas según el período o usar fechas personalizadas
    let endDate = new Date()
    let startDate = new Date()

    if (customStartDate && customEndDate) {
      // Usar fechas personalizadas - crear fechas en zona horaria de Colombia
      startDate = new Date(`${customStartDate}T00:00:00.000-05:00`)
      endDate = new Date(`${customEndDate}T23:59:59.999-05:00`)
    } else {
      // Usar período por defecto (último mes)
      startDate.setDate(endDate.getDate() - 30)
    }

    // Construir filtro base para asistencias
    const whereClause: any = {
      studentId: studentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Filtro por clase específica
    if (classIdParam !== "all") {
      const classId = parseInt(classIdParam)
      if (classId) {
        whereClause.session = {
          classId: classId
        }
      }
    }

    const attendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        session: {
          include: {
            danceClass: {
              include: {
                trainer: true
              }
            }
          }
        }
      },
      orderBy: {
        date: "desc",
      },
    })

    return NextResponse.json({
      attendances: attendances.map((att: any) => ({
        id: att.id,
        date: att.date,
        status: att.status,
        session: {
          id: att.session.id,
          date: att.session.date,
          danceClass: {
            id: att.session.danceClass.id,
            name: att.session.danceClass.name,
            sport: att.session.danceClass.sport,
            trainer: {
              name: att.session.danceClass.trainer.name
            }
          }
        }
      }))
    })
  } catch (error) {
    console.error("Error fetching student attendance details:", error)
    return NextResponse.json(
      { error: "Error al obtener detalles de asistencia" },
      { status: 500 }
    )
  }
}

