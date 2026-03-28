import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')
    const studentParam = url.searchParams.get('student')
    const matchParam = url.searchParams.get('match')

    // Validar que al menos un filtro esté presente
    const hasDateFilter = startDateParam || endDateParam;
    const hasStudentFilter = studentParam && studentParam !== 'all';
    const hasEventFilter = matchParam && matchParam !== 'all';
    
    if (!hasDateFilter && !hasStudentFilter && !hasEventFilter) {
      return NextResponse.json(
        { success: false, error: 'Debe seleccionar al menos un filtro (fecha, estudiante o evento) para exportar los eventos' },
        { status: 400 }
      )
    }

    // Construir filtros de fecha con manejo correcto de zona horaria Colombia (-5)
    const where: any = {
      matchDate: {}
    }
    
    if (startDateParam) {
      // Crear fecha en zona horaria de Colombia (UTC-5)
      const fromDate = new Date(startDateParam + 'T00:00:00-05:00')
      where.matchDate.gte = fromDate
    }
    
    if (endDateParam) {
      // Crear fecha en zona horaria de Colombia (UTC-5) hasta el final del día
      const toDate = new Date(endDateParam + 'T23:59:59-05:00')
      where.matchDate.lte = toDate
    }

    // Añadir filtros adicionales si se proporcionan
    if (studentParam && studentParam !== 'all') {
      where.attendances = {
        some: {
          studentId: studentParam
        }
      }
    }

    if (matchParam && matchParam !== 'all') {
      where.id = parseInt(matchParam)
    }

    // Obtener todos los eventos/partidos con información completa
    const matches = await prisma.match.findMany({
      where,
      include: {
        danceClass: {
          select: {
            id: true,
            name: true,
            sport: true,
            level: true,
            trainer: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            },
            location: {
              select: {
                id: true,
                name: true,
                address: true
              }
            }
          }
        },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                phone: true,
                isActive: true,
                hasDebt: true
              }
            }
          }
        }
      },
      orderBy: [
        { matchDate: 'desc' }
      ]
    })

    // Función helper para obtener nombre del deporte
    const getSportDisplayName = (sport: string) => {
      return sport === "DANCE" ? "Baile" : "Voleibol"
    }

    // Función helper para obtener nombre del nivel
    const getLevelDisplayName = (level: string) => {
      const levels: { [key: string]: string } = {
        'BEGINNER': 'Principiante',
        'INTERMEDIATE': 'Intermedio', 
        'ADVANCED': 'Avanzado'
      }
      return levels[level] || level || "No especificado"
    }

    // Función helper para obtener nombre del estado de asistencia
    const getAttendanceStatusDisplayName = (status: string) => {
      const statuses: { [key: string]: string } = {
        'PRESENT': 'Presente',
        'LATE': 'Tarde',
        'ABSENT': 'Ausente',
        'CHANGE_REQUEST': 'Solicitud de Cambio'
      }
      return statuses[status] || status
    }

    // Función helper para obtener nombre del estado del evento
    const getMatchStatusDisplayName = (status: string) => {
      const statuses: { [key: string]: string } = {
        'SCHEDULED': 'Programado',
        'IN_PROGRESS': 'En Progreso',
        'COMPLETED': 'Completado',
        'CANCELLED': 'Cancelado'
      }
      return statuses[status] || status
    }

    // Preparar datos para Excel
    const formatBogota = (value: Date | string, withTime: boolean) => {
      const date = typeof value === 'string' ? new Date(value) : value
      const options: Intl.DateTimeFormatOptions = withTime
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' }
      return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', ...options }).format(date)
    }

    const excelData = matches.flatMap((match, matchIndex) => {
      return match.attendances.map((attendance, attendanceIndex) => {
        return {
          'N°': matchIndex + 1,
          'N° Asistencia': attendanceIndex + 1,
          'ID Evento': match.id,
          'Fecha Evento': formatBogota(match.matchDate as any, true),
          'Estado Evento': getMatchStatusDisplayName(match.status),
          'Notas Evento': match.notes || 'Sin notas',
          
          // Información de la clase
          'ID Clase': match.danceClass.id,
          'Nombre Clase': match.danceClass.name,
          'Deporte': getSportDisplayName(match.danceClass.sport),
          'Nivel': getLevelDisplayName(match.danceClass.level),
          
          // Información del profesor
          'ID Profesor': match.danceClass.trainer.id,
          'Nombre Profesor': match.danceClass.trainer.name,
          'Teléfono Profesor': match.danceClass.trainer.phone,
          
          // Información de la ubicación
          'ID Ubicación': match.danceClass.location?.id || 'Sin ubicación',
          'Nombre Ubicación': match.danceClass.location?.name || 'Sin ubicación',
          'Dirección Ubicación': match.danceClass.location?.address || 'Sin dirección',
          
          // Información de la asistencia
          'ID Asistencia': attendance.id,
          'Estado Asistencia': getAttendanceStatusDisplayName(attendance.status),
          'Notas Asistencia': attendance.notes || 'Sin notas',
          'Fecha Registro Asistencia': formatBogota(attendance.createdAt as any, true),
          
          // Información del estudiante
          'ID Estudiante': attendance.student.id,
          'Nombre Estudiante': attendance.student.name,
          'Teléfono Estudiante': attendance.student.phone,
          'Estudiante Activo': attendance.student.isActive ? 'Sí' : 'No',
          'Estudiante con Deuda': attendance.student.hasDebt ? 'Sí' : 'No'
        }
      })
    })

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Configurar anchos de columna
    const columnWidths = [
      { wch: 5 },   // N°
      { wch: 12 },  // N° Asistencia
      { wch: 12 },  // ID Evento
      { wch: 20 },  // Fecha Evento
      { wch: 15 },  // Estado Evento
      { wch: 25 },  // Notas Evento
      { wch: 10 },  // ID Clase
      { wch: 25 },  // Nombre Clase
      { wch: 12 },  // Deporte
      { wch: 15 },  // Nivel
      { wch: 12 },  // ID Profesor
      { wch: 25 },  // Nombre Profesor
      { wch: 18 },  // Teléfono Profesor
      { wch: 12 },  // ID Ubicación
      { wch: 20 },  // Nombre Ubicación
      { wch: 30 },  // Dirección Ubicación
      { wch: 15 },  // ID Asistencia
      { wch: 15 },  // Estado Asistencia
      { wch: 25 },  // Notas Asistencia
      { wch: 25 },  // Fecha Registro Asistencia
      { wch: 15 },  // ID Estudiante
      { wch: 25 },  // Nombre Estudiante
      { wch: 18 },  // Teléfono Estudiante
      { wch: 15 },  // Estudiante Activo
      { wch: 18 }   // Estudiante con Deuda
    ]

    worksheet['!cols'] = columnWidths

    // Añadir worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Eventos')

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    // Crear nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `eventos_consolidado_${timestamp}.xlsx`

    // Retornar archivo Excel
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error exporting events to Excel:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar eventos a Excel' },
      { status: 500 }
    )
  }
}
