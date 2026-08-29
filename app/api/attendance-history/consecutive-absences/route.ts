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

    // Construir filtro base para asistencias
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: 'ABSENT', // Solo faltas
    }

    // Filtro por clase específica
    if (classIdParam !== "all") {
      const classId = Number.parseInt(classIdParam, 10)
      if (classId) {
        whereClause.session = {
          classId: classId
        }
      }
    }

    // Obtener todas las asistencias ausentes en el último mes
    const absentAttendances = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: true,
        session: {
          include: {
            danceClass: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })

    // Agrupar por estudiante Y clase para calcular faltas consecutivas por clase
    // Usamos una clave compuesta: studentId-classId
    const studentClassAbsencesMap: { [key: string]: any[] } = {}
    
    absentAttendances.forEach((attendance: any) => {
      const studentId = attendance.studentId
      const classId = attendance.session?.danceClass?.id || 'unknown'
      const key = `${studentId}-${classId}`
      
      if (!studentClassAbsencesMap[key]) {
        studentClassAbsencesMap[key] = []
      }
      studentClassAbsencesMap[key].push({
        date: new Date(attendance.date),
        sessionDate: attendance.session?.date ? new Date(attendance.session.date) : new Date(attendance.date),
        class: attendance.session?.danceClass,
        student: attendance.student
      })
    })

    // Obtener todas las clases únicas que tienen faltas para optimizar consultas
    const uniqueClassIds = Array.from(new Set(
      Object.values(studentClassAbsencesMap)
        .flat()
        .map((a: any) => a.class?.id)
        .filter((id): id is number => id !== undefined && id !== 'unknown')
    ))

    // Obtener todas las sesiones de todas las clases de una vez para optimizar
    const allClassSessionsMap = new Map<number, Array<{ id: number; date: Date }>>()
    
    if (uniqueClassIds.length > 0) {
      const allSessions = await prisma.classSession.findMany({
        where: {
          classId: {
            in: uniqueClassIds
          },
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: {
          date: 'asc'
        },
        select: {
          id: true,
          date: true,
          classId: true
        }
      })

      // Agrupar sesiones por clase
      for (const session of allSessions) {
        if (!allClassSessionsMap.has(session.classId)) {
          allClassSessionsMap.set(session.classId, [])
        }
        allClassSessionsMap.get(session.classId)!.push({
          id: session.id,
          date: session.date
        })
      }
    }

    // Normalizar fechas a solo fecha (sin hora) para comparación
    const normalizeDate = (date: Date) => {
      const d = new Date(date)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }

    // Encontrar estudiantes con 3 o más faltas consecutivas por clase
    const studentsWithConsecutiveAbsences: any[] = []

    for (const key of Object.keys(studentClassAbsencesMap)) {
      const absences = studentClassAbsencesMap[key]
      if (absences.length < 3) continue

      // Ordenar por fecha de sesión (no fecha de registro)
      absences.sort((a, b) => a.sessionDate.getTime() - b.sessionDate.getTime())

      // Obtener todas las sesiones de esta clase en el período para determinar frecuencia
      // Esto nos ayuda a entender si las faltas son en sesiones consecutivas
      const classId = absences[0].class?.id
      if (!classId || typeof classId !== 'number') continue

      // Obtener sesiones de esta clase desde el mapa
      const allClassSessions = allClassSessionsMap.get(classId) || []

      // Buscar secuencias consecutivas considerando sesiones de clase
      // Para clases con días específicos (ej: miércoles y viernes), necesitamos
      // verificar si las faltas son en sesiones consecutivas de la clase
      let maxConsecutive = 1
      let currentConsecutive = 1

      // Crear lista de fechas de sesiones normalizadas y ordenadas
      const sessionDates = allClassSessions
        .map(s => normalizeDate(s.date))
        .sort((a, b) => a - b)

      for (let i = 1; i < absences.length; i++) {
        const currentSessionDate = absences[i].sessionDate
        const previousSessionDate = absences[i - 1].sessionDate
        const daysDiff = Math.floor((currentSessionDate.getTime() - previousSessionDate.getTime()) / (1000 * 60 * 60 * 24))

        // Normalizar fechas para comparación
        const currentDateNormalized = normalizeDate(currentSessionDate)
        const previousDateNormalized = normalizeDate(previousSessionDate)

        // Verificar si son sesiones consecutivas de la clase
        const currentSessionIndex = sessionDates.findIndex(d => d === currentDateNormalized)
        const previousSessionIndex = sessionDates.findIndex(d => d === previousDateNormalized)
        
        const isConsecutiveSession = currentSessionIndex !== -1 && 
                                     previousSessionIndex !== -1 && 
                                     currentSessionIndex === previousSessionIndex + 1

        // Criterio para considerar consecutivo:
        // 1. Si son sesiones consecutivas de la clase (índices adyacentes en la lista de sesiones)
        // 2. O si la diferencia es <= 3 días (para clases que se dan varios días por semana)
        // 3. O si la diferencia es <= 7 días (para clases semanales)
        if (isConsecutiveSession || daysDiff <= 7) {
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

      // Si tiene 3 o más faltas consecutivas en esta clase, agregarlo a la lista
      if (maxConsecutive >= 3) {
        const student = absences[0].student
        // Solo estudiantes activos
        if (!student.isActive) continue
        const lastAbsence = absences.at(-1)
        
        if (student && lastAbsence.class) {
          studentsWithConsecutiveAbsences.push({
            id: student.id,
            name: student.name,
            avatar: student.avatar || "",
            consecutiveAbsences: maxConsecutive,
            lastAbsenceDate: lastAbsence.sessionDate,
            class: {
              id: lastAbsence.class.id,
              name: lastAbsence.class.name,
              sport: lastAbsence.class.sport
            }
          })
        }
      }
    }

    // Ordenar por número de faltas consecutivas (mayor a menor)
    studentsWithConsecutiveAbsences.sort((a, b) => b.consecutiveAbsences - a.consecutiveAbsences)

    return NextResponse.json({
      students: studentsWithConsecutiveAbsences
    })
  } catch (error) {
    console.error("Error fetching consecutive absences:", error)
    return NextResponse.json(
      { error: "Error al obtener estudiantes con faltas consecutivas" },
      { status: 500 }
    )
  }
}

