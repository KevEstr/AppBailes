import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const matchIdParam = searchParams.get("match") || "all"

    // Calcular fecha del último mes
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)

    // Filtro base: asistencias de eventos en el período
    const whereClause: any = {
      match: {
        matchDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    }

    if (matchIdParam !== "all") {
      const matchId = parseInt(matchIdParam)
      if (matchId) {
        whereClause.matchId = matchId
      }
    }

    // 1. Obtener TODAS las asistencias del período (todos los estados)
    const allAttendances = await prisma.matchAttendance.findMany({
      where: whereClause,
      include: {
        student: true,
        match: {
          include: {
            danceClass: {
              select: { id: true, name: true, sport: true },
            },
          },
        },
      },
      orderBy: {
        match: {
          matchDate: 'asc',
        },
      },
    })

    // 2. Agrupar por (studentId + classId del match), ordenando por matchDate
    const studentClassMap = new Map<string, Array<{
      matchDate: Date
      status: string
      student: any
      danceClass: any
    }>>()

    for (const a of allAttendances) {
      const classId = a.match?.danceClass?.id ?? 'unknown'
      const key = `${a.studentId}|${classId}`
      if (!studentClassMap.has(key)) studentClassMap.set(key, [])
      studentClassMap.get(key)!.push({
        matchDate: new Date(a.match.matchDate),
        status: a.status,
        student: a.student,
        danceClass: a.match?.danceClass,
      })
    }

    // 3. Para cada (estudiante, clase): si los últimos 3 registros de asistencia
    //    son AUSENTE y el estudiante está activo, mostrarlo.
    const results: any[] = []

    for (const [, records] of studentClassMap) {
      // Ordenar por fecha ascendente
      records.sort((a, b) => a.matchDate.getTime() - b.matchDate.getTime())

      // Solo estudiantes activos
      if (!records[0].student.isActive) continue

      // Necesita al menos 3 registros de asistencia
      if (records.length < 3) continue

      // Tomar los últimos 3 registros
      const last3 = records.slice(-3)

      // Si al menos 1 de los últimos 3 NO es AUSENTE, no aplica
      if (last3.some(r => r.status !== 'ABSENT')) continue

      // Contar la racha de ausencias desde la más reciente hacia atrás
      let streak = 0
      for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].status === 'ABSENT') streak++
        else break
      }

      const student = records[0].student
      const dc = records[0].danceClass

      results.push({
        id: student.id,
        name: student.name,
        avatar: student.avatar || "",
        consecutiveAbsences: streak,
        lastAbsenceDate: records[records.length - 1].matchDate,
        class: dc
          ? {
              id: dc.id,
              name: dc.name,
              sport: dc.sport,
            }
          : undefined,
      })
    }

    // Ordenar por número de faltas consecutivas (mayor a menor)
    results.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences)

    return NextResponse.json({
      students: results,
    })
  } catch (error) {
    console.error("Error fetching match consecutive absences:", error)
    return NextResponse.json(
      { error: "Error al obtener estudiantes con faltas consecutivas en eventos" },
      { status: 500 }
    )
  }
}