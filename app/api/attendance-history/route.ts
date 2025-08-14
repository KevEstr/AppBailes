import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"
    const studentIdParam = searchParams.get("student") || "all"
    const classIdParam = searchParams.get("class") || "all"
    const sessionIdParam = searchParams.get("session") || "all"
    const pageParam = parseInt(searchParams.get("page") || "1")
    const limitParam = parseInt(searchParams.get("limit") || "25")
    const search = (searchParams.get("search") || "").trim()

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

    // Construir filtro base para asistencias
    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Filtro por estudiante específico
    if (studentIdParam !== "all") {
      const studentId = parseInt(studentIdParam)
      if (studentId) {
        whereClause.studentId = studentId
      }
    }

    // Filtro por sesión específica (tiene prioridad sobre filtro por clase)
    if (sessionIdParam !== "all") {
      const sessionId = parseInt(sessionIdParam)
      if (sessionId) {
        whereClause.sessionId = sessionId
      }
    } else if (classIdParam !== "all") {
      // Filtro por clase específica (solo si no hay filtro por sesión)
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
        student: true,
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

    // Generar estadísticas por estudiante (considerando filtro por clase)
    const studentAttendanceFilter: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Aplicar filtros por sesión o clase a las estadísticas de estudiantes
    if (sessionIdParam !== "all") {
      const sessionId = parseInt(sessionIdParam)
      if (sessionId) {
        studentAttendanceFilter.sessionId = sessionId
      }
    } else if (classIdParam !== "all") {
      const classId = parseInt(classIdParam)
      if (classId) {
        studentAttendanceFilter.session = {
          classId: classId
        }
      }
    }

    const studentWhere: any = { isActive: true }
    if (search) {
      studentWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { id: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Cuando se filtra por sesión o clase, limitar estudiantes a quienes tengan asistencias en ese rango
    // para no traer todos los estudiantes.
    if (sessionIdParam !== "all" || classIdParam !== "all") {
      const relationFilter: any = {
        date: {
          gte: startDate,
          lte: endDate,
        }
      }
      if (sessionIdParam !== "all") {
        const sessionId = parseInt(sessionIdParam)
        if (sessionId) {
          relationFilter.sessionId = sessionId
        }
      } else if (classIdParam !== "all") {
        const classId = parseInt(classIdParam)
        if (classId) {
          relationFilter.session = { classId }
        }
      }
      studentWhere.attendances = { some: relationFilter }
    }

    const skip = (Math.max(pageParam, 1) - 1) * Math.max(limitParam, 1)

    const [students, totalStudents] = await Promise.all([
      prisma.student.findMany({
        where: studentWhere,
        orderBy: { name: 'asc' },
        skip,
        take: Math.max(limitParam, 1),
        include: {
          attendances: {
            where: studentAttendanceFilter,
            include: {
              session: {
                include: {
                  danceClass: true
                }
              }
            }
          },
        },
      }),
      prisma.student.count({ where: studentWhere })
    ])

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

    // Obtener lista de clases disponibles para el filtro
    const availableClasses = await prisma.danceClass.findMany({
      where: { isActive: true },
      include: {
        trainer: true,
        sessions: {
          where: {
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          take: 1 // Solo necesitamos saber si hay sesiones en el período
        }
      },
      orderBy: [
        { sport: 'asc' },
        { name: 'asc' }
      ]
    })

    // Filtrar solo las clases que tuvieron sesiones en el período seleccionado
    const classesWithSessions = availableClasses.filter(cls => cls.sessions.length > 0)

    // Información adicional de la clase seleccionada (si aplica)
    let selectedClassInfo = null
    let availableSessions: any[] = []
    let selectedSessionInfo = null

    if (sessionIdParam !== "all") {
      // Si hay una sesión específica seleccionada
      const sessionId = parseInt(sessionIdParam)
      if (sessionId) {
        selectedSessionInfo = await prisma.classSession.findUnique({
          where: { id: sessionId },
          include: {
            danceClass: {
              include: {
                trainer: true
              }
            },
            attendances: {
              include: {
                student: true
              }
            }
          }
        })
      }
    } else if (classIdParam !== "all") {
      // Si hay una clase específica seleccionada, obtener sus sesiones
      const classId = parseInt(classIdParam)
      if (classId) {
        selectedClassInfo = await prisma.danceClass.findUnique({
          where: { id: classId },
          include: {
            trainer: true,
            sessions: {
              where: {
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              orderBy: {
                date: 'desc'
              }
            }
          }
        })

        // Obtener sesiones disponibles para el filtro
        availableSessions = await prisma.classSession.findMany({
          where: {
            classId: classId,
            date: {
              gte: startDate,
              lte: endDate,
            },
          },
          include: {
            danceClass: {
              select: { name: true, sport: true }
            },
            attendances: {
              take: 1 // Solo para verificar si tiene asistencias
            }
          },
          orderBy: {
            date: 'desc'
          }
        })
      }
    }

    const totalPages = Math.ceil(totalStudents / Math.max(limitParam, 1))

    return NextResponse.json({
      chartData,
      studentStats,
      availableClasses: classesWithSessions,
      selectedClassInfo,
      availableSessions,
      selectedSessionInfo,
      pagination: {
        page: Math.max(pageParam, 1),
        limit: Math.max(limitParam, 1),
        total: totalStudents,
        totalPages,
        hasNext: Math.max(pageParam, 1) < totalPages,
        hasPrev: Math.max(pageParam, 1) > 1
      }
    })
  } catch (error) {
    console.error("Error fetching attendance history:", error)
    return NextResponse.json({ error: "Error al obtener historial de asistencia" }, { status: 500 })
  }
}
