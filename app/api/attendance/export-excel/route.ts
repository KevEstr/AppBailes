import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')
    const studentParam = url.searchParams.get('student')
    const classParam = url.searchParams.get('class')

    // Validar que al menos un filtro esté presente
    const hasDateFilter = startDateParam || endDateParam;
    const hasStudentFilter = studentParam && studentParam !== 'all';
    const hasClassFilter = classParam && classParam !== 'all';
    
    if (!hasDateFilter && !hasStudentFilter && !hasClassFilter) {
      return NextResponse.json(
        { success: false, error: 'Debe seleccionar al menos un filtro (fecha, estudiante o clase) para exportar las asistencias' },
        { status: 400 }
      )
    }

    // Construir filtros de fecha con manejo correcto de zona horaria Colombia (-5)
    const where: any = {
      date: {}
    }
    
    if (startDateParam) {
      // Crear fecha en zona horaria de Colombia (UTC-5)
      const fromDate = new Date(startDateParam + 'T00:00:00-05:00')
      where.date.gte = fromDate
    }
    
    if (endDateParam) {
      // Crear fecha en zona horaria de Colombia (UTC-5) hasta el final del día
      const toDate = new Date(endDateParam + 'T23:59:59-05:00')
      where.date.lte = toDate
    }

    // Añadir filtros adicionales si se proporcionan
    if (studentParam && studentParam !== 'all') {
      where.studentId = studentParam
    }

    if (classParam && classParam !== 'all') {
      where.session = {
        classId: parseInt(classParam)
      }
    }

    // Obtener todas las asistencias con información completa
    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            isActive: true,
            hasDebt: true
          }
        },
        session: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
            notes: true,
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
            }
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
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

    // Función helper para obtener nombre del estado de sesión
    const getSessionStatusDisplayName = (status: string) => {
      const statuses: { [key: string]: string } = {
        'SCHEDULED': 'Programada',
        'IN_PROGRESS': 'En Progreso',
        'COMPLETED': 'Completada',
        'CANCELLED': 'Cancelada'
      }
      return statuses[status] || status
    }

    // Preparar datos para Excel
    const excelData = attendances.map((attendance, index) => {
      return {
        'N°': index + 1,
        'ID Asistencia': attendance.id,
        'Fecha Asistencia': new Date(attendance.date).toLocaleDateString('es-ES', {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }),
        'Estado Asistencia': getAttendanceStatusDisplayName(attendance.status),
        'Notas Asistencia': attendance.notes || 'Sin notas',
        'Fecha Registro': new Date(attendance.createdAt).toLocaleDateString('es-ES', {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        }),
        
        // Información del estudiante
        'ID Estudiante': attendance.student.id,
        'Nombre Estudiante': attendance.student.name,
        'Teléfono Estudiante': attendance.student.phone,
        'Estudiante Activo': attendance.student.isActive ? 'Sí' : 'No',
        'Estudiante con Deuda': attendance.student.hasDebt ? 'Sí' : 'No',
        
        // Información de la sesión
        'ID Sesión': attendance.session?.id || 'Sin sesión',
        'Fecha Sesión': attendance.session ? 
          new Date(attendance.session.date).toLocaleDateString('es-ES', {
            year: 'numeric', month: '2-digit', day: '2-digit'
          }) : 'Sin fecha',
        'Hora Inicio': attendance.session ? 
          new Date(attendance.session.startTime).toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit'
          }) : 'Sin hora',
        'Hora Fin': attendance.session ? 
          new Date(attendance.session.endTime).toLocaleTimeString('es-ES', {
            hour: '2-digit', minute: '2-digit'
          }) : 'Sin hora',
        'Estado Sesión': attendance.session ? getSessionStatusDisplayName(attendance.session.status) : 'Sin estado',
        'Notas Sesión': attendance.session?.notes || 'Sin notas',
        
        // Información de la clase
        'ID Clase': attendance.session?.danceClass?.id || 'Sin clase',
        'Nombre Clase': attendance.session?.danceClass?.name || 'Sin clase',
        'Deporte': attendance.session?.danceClass ? getSportDisplayName(attendance.session.danceClass.sport) : 'Sin deporte',
        'Nivel': attendance.session?.danceClass ? getLevelDisplayName(attendance.session.danceClass.level) : 'Sin nivel',
        
        // Información del profesor
        'ID Profesor': attendance.session?.danceClass?.trainer?.id || 'Sin profesor',
        'Nombre Profesor': attendance.session?.danceClass?.trainer?.name || 'Sin profesor',
        'Teléfono Profesor': attendance.session?.danceClass?.trainer?.phone || 'Sin teléfono',
        
        // Información de la ubicación
        'ID Ubicación': attendance.session?.danceClass?.location?.id || 'Sin ubicación',
        'Nombre Ubicación': attendance.session?.danceClass?.location?.name || 'Sin ubicación',
        'Dirección Ubicación': attendance.session?.danceClass?.location?.address || 'Sin dirección'
      }
    })

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Configurar anchos de columna
    const columnWidths = [
      { wch: 5 },   // N°
      { wch: 15 },  // ID Asistencia
      { wch: 20 },  // Fecha Asistencia
      { wch: 15 },  // Estado Asistencia
      { wch: 25 },  // Notas Asistencia
      { wch: 20 },  // Fecha Registro
      { wch: 15 },  // ID Estudiante
      { wch: 25 },  // Nombre Estudiante
      { wch: 18 },  // Teléfono Estudiante
      { wch: 15 },  // Estudiante Activo
      { wch: 18 },  // Estudiante con Deuda
      { wch: 12 },  // ID Sesión
      { wch: 15 },  // Fecha Sesión
      { wch: 12 },  // Hora Inicio
      { wch: 12 },  // Hora Fin
      { wch: 15 },  // Estado Sesión
      { wch: 20 },  // Notas Sesión
      { wch: 10 },  // ID Clase
      { wch: 25 },  // Nombre Clase
      { wch: 12 },  // Deporte
      { wch: 15 },  // Nivel
      { wch: 12 },  // ID Profesor
      { wch: 25 },  // Nombre Profesor
      { wch: 18 },  // Teléfono Profesor
      { wch: 12 },  // ID Ubicación
      { wch: 20 },  // Nombre Ubicación
      { wch: 30 }   // Dirección Ubicación
    ]

    worksheet['!cols'] = columnWidths

    // Añadir worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencias')

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    // Crear nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `asistencias_consolidado_${timestamp}.xlsx`

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
    console.error('Error exporting attendance to Excel:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar asistencias a Excel' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
