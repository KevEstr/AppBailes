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

    // Construir filtro base para asistencias de eventos
    const whereClause: any = {
      match: {
        matchDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      status: 'ABSENT', // Solo faltas
    }

    // Filtro por evento específico
    if (matchIdParam !== "all") {
      const matchId = parseInt(matchIdParam)
      if (matchId) {
        whereClause.matchId = matchId
      }
    }

    // Obtener todas las asistencias ausentes en el último mes
    const absentAttendances = await prisma.matchAttendance.findMany({
      where: whereClause,
      include: {
        student: true,
        match: {
          include: {
            danceClass: true
          }
        }
      },
      orderBy: {
        match: {
          matchDate: 'asc'
        }
      }
    })

    // Agrupar por estudiante y encontrar faltas consecutivas
    const studentAbsencesMap: { [key: string]: any[] } = {}
    
    absentAttendances.forEach((attendance: any) => {
      const studentId = attendance.studentId
      if (!studentAbsencesMap[studentId]) {
        studentAbsencesMap[studentId] = []
      }
      studentAbsencesMap[studentId].push({
        date: new Date(attendance.match.matchDate),
        class: attendance.match.danceClass
      })
    })

    // Encontrar estudiantes con 3 o más faltas consecutivas
    const studentsWithConsecutiveAbsences: any[] = []

    Object.keys(studentAbsencesMap).forEach((studentId) => {
      const absences = studentAbsencesMap[studentId]
      if (absences.length < 3) return

      // Ordenar por fecha
      absences.sort((a, b) => a.date.getTime() - b.date.getTime())

      // Buscar secuencias consecutivas
      let maxConsecutive = 1
      let currentConsecutive = 1 // Empezamos con 1 porque ya tenemos la primera falta

      for (let i = 1; i < absences.length; i++) {
        const currentDate = absences[i].date
        const previousDate = absences[i - 1].date
        const daysDiff = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24))

        // Si la diferencia es 1 día o menos (mismo día o día siguiente), es consecutivo
        if (daysDiff <= 1) {
          currentConsecutive++
        } else {
          // Si encontramos una secuencia de 3 o más, actualizar maxConsecutive
          if (currentConsecutive >= 3 && currentConsecutive > maxConsecutive) {
            maxConsecutive = currentConsecutive
          }
          currentConsecutive = 1
        }
      }

      // Verificar la última secuencia
      if (currentConsecutive >= 3 && currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive
      }

      // Si tiene 3 o más faltas consecutivas, agregarlo a la lista
      if (maxConsecutive >= 3) {
        const student = absentAttendances.find((att: any) => att.studentId === studentId)?.student
        const lastAbsence = absences[absences.length - 1]
        
        if (student) {
          studentsWithConsecutiveAbsences.push({
            id: student.id,
            name: student.name,
            avatar: student.avatar || "",
            consecutiveAbsences: maxConsecutive,
            lastAbsenceDate: lastAbsence.date,
            class: lastAbsence.class ? {
              id: lastAbsence.class.id,
              name: lastAbsence.class.name,
              sport: lastAbsence.class.sport
            } : undefined
          })
        }
      }
    })

    // Ordenar por número de faltas consecutivas (mayor a menor)
    studentsWithConsecutiveAbsences.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences)

    return NextResponse.json({
      students: studentsWithConsecutiveAbsences
    })
  } catch (error) {
    console.error("Error fetching match consecutive absences:", error)
    return NextResponse.json(
      { error: "Error al obtener estudiantes con faltas consecutivas en eventos" },
      { status: 500 }
    )
  }
}

