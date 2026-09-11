import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const classIdParam = searchParams.get("class") || "all"

    // Calcular fecha del último mes
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 1)

    // Construir filtro base
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (classIdParam !== "all") {
      const classId = Number.parseInt(classIdParam, 10)
      if (classId) {
        whereClause.session = {
          classId: classId,
        }
      }
    }

    // 1. Obtener TODAS las asistencias del período (todos los estados)
    const allAttendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: true,
        session: {
          include: {
            danceClass: {
              select: { id: true, name: true, sport: true },
            },
          },
        },
      },
    })

    // 2. Agrupar por (studentId + classId), ordenando por fecha de sesión
    const studentClassMap = new Map<string, Array<{
      sessionDate: Date
      status: string
      student: any
      danceClass: any
    }>>()

    for (const a of allAttendances) {
      const classId = a.session?.danceClass?.id ?? a.session?.classId ?? 'unknown'
      const key = `${a.studentId}|${classId}`
      if (!studentClassMap.has(key)) studentClassMap.set(key, [])
      studentClassMap.get(key)!.push({
        sessionDate: a.session?.date ? new Date(a.session.date) : new Date(a.date),
        status: a.status,
        student: a.student,
        danceClass: a.session?.danceClass,
      })
    }

    // 3. Para cada (estudiante, clase): si los últimos 3 registros de asistencia
    //    son AUSENTE y el estudiante está activo, mostrarlo.
    const results: any[] = []

    for (const [, records] of studentClassMap) {
      // Ordenar por fecha de sesión ascendente
      records.sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime())

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
        lastAbsenceDate: records[records.length - 1].sessionDate,
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
    console.error("Error fetching consecutive absences:", error)
    return NextResponse.json(
      { error: "Error al obtener estudiantes con faltas consecutivas" },
      { status: 500 }
    )
  }
}