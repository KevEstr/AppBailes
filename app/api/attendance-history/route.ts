import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentIdParam = searchParams.get("student") || "all"
    const classIdParam = searchParams.get("class") || "all"
    const pageParam = parseInt(searchParams.get("page") || "1")
    const limitParam = parseInt(searchParams.get("limit") || "25")
    const search = (searchParams.get("search") || "").trim()
    const customStartDate = searchParams.get("startDate")
    const customEndDate = searchParams.get("endDate")

    // Calcular fechas según el período o usar fechas personalizadas
    let endDate = new Date()
    let startDate = new Date()

    if (customStartDate && customEndDate) {
      // Usar fechas personalizadas - crear fechas en zona horaria de Colombia
      // Agregar zona horaria de Colombia para evitar problemas de conversión
      startDate = new Date(`${customStartDate}T00:00:00.000-05:00`)
      endDate = new Date(`${customEndDate}T23:59:59.999-05:00`)
    } else {
      // Usar período por defecto (último mes)
      startDate.setDate(endDate.getDate() - 30)
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
      whereClause.studentId = studentIdParam
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

    // Generar datos para el gráfico basándose en el rango de fechas
    const chartData = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" })

      const dayAttendances = attendances.filter((att: any) => {
        const attDate = new Date(att.date)
        return attDate.toDateString() === currentDate.toDateString()
      })

      chartData.push({
        date: dateStr,
        present: dayAttendances.filter((att: any) => att.status === 'PRESENT').length,
        late: dayAttendances.filter((att: any) => att.status === 'LATE').length,
        absent: dayAttendances.filter((att: any) => att.status === 'ABSENT').length,
      })
      
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Generar estadísticas por estudiante (considerando filtro por clase)
    const studentAttendanceFilter: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    // Aplicar filtro por clase a las estadísticas de estudiantes
    if (classIdParam !== "all") {
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

    // Limitar estudiantes a quienes tengan asistencias en el rango de fechas seleccionado
    // para no traer todos los estudiantes.
    const relationFilter: any = {
      date: {
        gte: startDate,
        lte: endDate,
      }
    }
    
    // Si hay una clase específica seleccionada, agregar ese filtro también
    if (classIdParam !== "all") {
      const classId = parseInt(classIdParam)
      if (classId) {
        relationFilter.session = { classId }
      }
    }
    
    studentWhere.attendances = { some: relationFilter }

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
        schedules: true, // Incluir horarios para verificar días de la semana
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

    // Filtrar clases que tuvieron sesiones en el período seleccionado
    let classesWithSessions = availableClasses.filter(cls => cls.sessions.length > 0)

    // Si se seleccionó un solo día, filtrar también por día de la semana
    const isSingleDay = startDate.toDateString() === endDate.toDateString()
    if (isSingleDay) {
      const selectedDayOfWeek = startDate.getDay() // 0 = domingo, 1 = lunes, etc.
      classesWithSessions = classesWithSessions.filter(cls => 
        cls.schedules.some(schedule => schedule.dayOfWeek === selectedDayOfWeek)
      )
    }

    // Información adicional de la clase seleccionada (si aplica)
    let selectedClassInfo = null

    if (classIdParam !== "all") {
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
      }
    }

    const totalPages = Math.ceil(totalStudents / Math.max(limitParam, 1))

    return NextResponse.json({
      chartData,
      studentStats,
      availableClasses: classesWithSessions,
      selectedClassInfo,
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
