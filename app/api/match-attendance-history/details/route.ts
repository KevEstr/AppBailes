import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentIdParam = searchParams.get("student")
    const matchIdParam = searchParams.get("match") || "all"
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

    // Construir filtro base para asistencias de eventos
    const whereClause: any = {
      studentId: studentId,
      match: {
        matchDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    }

    // Filtro por evento específico
    if (matchIdParam !== "all") {
      const matchId = parseInt(matchIdParam)
      if (matchId) {
        whereClause.matchId = matchId
      }
    }

    const attendances = await prisma.matchAttendance.findMany({
      where: whereClause,
      include: {
        match: {
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
        match: {
          matchDate: "desc"
        }
      },
    })

    return NextResponse.json({
      attendances: attendances.map((att: any) => ({
        id: att.id,
        status: att.status,
        match: {
          id: att.match.id,
          matchDate: att.match.matchDate,
          notes: att.match.notes,
          status: att.match.status,
          danceClass: {
            id: att.match.danceClass.id,
            name: att.match.danceClass.name,
            sport: att.match.danceClass.sport,
            trainer: {
              name: att.match.danceClass.trainer.name
            }
          }
        }
      }))
    })
  } catch (error) {
    console.error("Error fetching match attendance details:", error)
    return NextResponse.json(
      { error: "Error al obtener detalles de asistencia a eventos" },
      { status: 500 }
    )
  }
}

