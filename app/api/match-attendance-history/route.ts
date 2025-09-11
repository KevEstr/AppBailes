import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentIdParam = searchParams.get("student") || "all"
    const matchIdParam = searchParams.get("match") || "all"
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

    // Construir filtro base para asistencias de partidos
    const whereClause: any = {
      match: {
        matchDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    }

    // Filtro por estudiante específico
    if (studentIdParam !== "all") {
      const studentId = parseInt(studentIdParam)
      if (studentId) {
        whereClause.studentId = studentId.toString()
      }
    }

    // Filtro por partido específico
    if (matchIdParam !== "all") {
      const matchId = parseInt(matchIdParam)
      if (matchId) {
        whereClause.matchId = matchId
      }
    }

    // Obtener asistencias de partidos
    const matchAttendances = await prisma.matchAttendance.findMany({
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
        },
        student: true
      },
      orderBy: {
        match: {
          matchDate: 'desc'
        }
      }
    })

    // Procesar datos para gráficos
    const chartData: { [key: string]: { present: number; late: number; absent: number } } = {}
    
    matchAttendances.forEach(attendance => {
      const dateKey = new Date(attendance.match.matchDate).toLocaleDateString("es-ES", {
        day: '2-digit',
        month: '2-digit'
      })
      
      if (!chartData[dateKey]) {
        chartData[dateKey] = { present: 0, late: 0, absent: 0 }
      }
      
      if (attendance.status === 'PRESENT') {
        chartData[dateKey].present++
      } else if (attendance.status === 'LATE') {
        chartData[dateKey].late++
      } else {
        chartData[dateKey].absent++
      }
    })

    const chartDataArray = Object.entries(chartData).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/')
      const [dayB, monthB] = b.date.split('/')
      return new Date(2024, parseInt(monthA) - 1, parseInt(dayA)).getTime() - 
             new Date(2024, parseInt(monthB) - 1, parseInt(dayB)).getTime()
    })

    // Calcular estadísticas por estudiante
    const studentStatsMap: { [key: string]: { 
      id: string; 
      name: string; 
      avatar: string; 
      totalMatches: number; 
      present: number; 
      late: number; 
      absent: number; 
    } } = {}

    matchAttendances.forEach(attendance => {
      const studentId = attendance.studentId
      if (!studentStatsMap[studentId]) {
        studentStatsMap[studentId] = {
          id: attendance.student.id,
          name: attendance.student.name,
          avatar: attendance.student.avatar || "",
          totalMatches: 0,
          present: 0,
          late: 0,
          absent: 0
        }
      }
      
      studentStatsMap[studentId].totalMatches++
      
      if (attendance.status === 'PRESENT') {
        studentStatsMap[studentId].present++
      } else if (attendance.status === 'LATE') {
        studentStatsMap[studentId].late++
      } else {
        studentStatsMap[studentId].absent++
      }
    })

    // Aplicar filtro de búsqueda si existe
    let filteredStudentStats = Object.values(studentStatsMap)
    if (search) {
      filteredStudentStats = filteredStudentStats.filter(student => 
        student.name.toLowerCase().includes(search.toLowerCase()) ||
        student.id.includes(search)
      )
    }

    // Calcular porcentajes y ordenar
    const studentStats = filteredStudentStats.map(student => ({
      ...student,
      percentage: student.totalMatches > 0 ? 
        ((student.present + student.late) / student.totalMatches) * 100 : 0
    })).sort((a, b) => b.percentage - a.percentage)

    // Paginación
    const totalStudents = studentStats.length
    const skip = (pageParam - 1) * limitParam
    const paginatedStudentStats = studentStats.slice(skip, skip + limitParam)

    // Obtener partidos disponibles
    const availableMatches = await prisma.match.findMany({
      where: {
        matchDate: {
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
        matchDate: 'desc'
      }
    })

    // Información del partido específico seleccionado
    let selectedMatchInfo = null
    if (matchIdParam !== "all") {
      const matchId = parseInt(matchIdParam)
      if (matchId) {
        selectedMatchInfo = await prisma.match.findUnique({
          where: { id: matchId },
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
    }

    const totalPages = Math.ceil(totalStudents / Math.max(limitParam, 1))

    return NextResponse.json({
      chartData: chartDataArray,
      matchStats: paginatedStudentStats,
      availableMatches: availableMatches,
      selectedMatchInfo: selectedMatchInfo,
      pagination: {
        page: pageParam,
        limit: limitParam,
        total: totalStudents,
        totalPages: totalPages,
        hasNext: pageParam < totalPages,
        hasPrev: pageParam > 1
      }
    })

  } catch (error) {
    console.error("Error loading match attendance data:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
