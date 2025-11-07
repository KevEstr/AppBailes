import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma"
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const url = new URL(request.url)
    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')
    const userIdParam = url.searchParams.get('userId')
    const searchParam = url.searchParams.get('search')

    const hasDateFilter = !!(startDateParam || endDateParam)
    const hasUserFilter = !!userIdParam && userIdParam !== 'all'
    const hasSearchFilter = !!(searchParam && searchParam.trim() !== '')

    if (!hasDateFilter && !hasUserFilter && !hasSearchFilter) {
      return NextResponse.json(
        { success: false, error: 'Debe seleccionar al menos un filtro (fecha, usuario o búsqueda) para exportar' },
        { status: 400 }
      )
    }

    // Calcular fechas
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(`${startDateParam}T00:00:00.000-05:00`);
    }
    if (endDateParam) {
      endDate = new Date(`${endDateParam}T23:59:59.999-05:00`);
    }

    // Construir filtro base
    const whereClause: any = {};

    // Filtro por usuario (trainer)
    if (hasUserFilter) {
      const userId = parseInt(userIdParam as string);
      if (userId) {
        whereClause.userId = userId;
      }
    }

    // Filtro por rango de fechas
    if (hasDateFilter) {
      whereClause.match = {
        matchDate: {}
      };
      if (startDate) {
        whereClause.match.matchDate.gte = startDate;
      }
      if (endDate) {
        whereClause.match.matchDate.lte = endDate;
      }
    }

    // Filtro de búsqueda
    if (hasSearchFilter) {
      whereClause.OR = [
        {
          match: {
            danceClass: {
              name: { contains: searchParam, mode: 'insensitive' }
            }
          }
        },
        {
          notes: { contains: searchParam, mode: 'insensitive' }
        }
      ];
    }

    // Obtener asistencias de eventos
    const attendances = await (prisma as any).matchTrainerAttendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        },
        match: {
          include: {
            danceClass: {
              include: {
                trainer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    const statusLabel: Record<string, string> = {
      PRESENT: 'Presente',
      LATE: 'Tarde',
      ABSENT: 'Ausente',
      CHANGE_REQUEST: 'Cambio'
    }

    const matchStatusLabel: Record<string, string> = {
      SCHEDULED: 'Programado',
      IN_PROGRESS: 'En Progreso',
      COMPLETED: 'Completado',
      CANCELLED: 'Cancelado'
    }

    const formatBogota = (value: Date | string, withTime: boolean) => {
      const date = typeof value === 'string' ? new Date(value) : value
      const options: Intl.DateTimeFormatOptions = withTime
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' }
      return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', ...options }).format(date)
    }

    const excelData = attendances.map((att: any, index: number) => ({
      'N°': index + 1,
      'Fecha Evento': formatBogota(att.match.matchDate, true),
      'Fecha Registro': formatBogota(att.date, false),
      'Registrado': formatBogota(att.createdAt, true),
      'Estado Asistencia': statusLabel[att.status] || att.status,
      'Estado Evento': matchStatusLabel[att.match.status] || att.match.status,
      'Notas': att.notes || 'N/A',
      'Usuario ID': att.user?.id ?? 'N/A',
      'Usuario Email': att.user?.email ?? 'N/A',
      'Rol': att.user?.role ?? 'N/A',
      'Evento ID': att.match?.id ?? 'N/A',
      'Notas Evento': att.match?.notes || 'N/A',
      'Clase ID': att.match?.danceClass?.id ?? 'N/A',
      'Clase Nombre': att.match?.danceClass?.name ?? 'N/A',
      'Profesor Clase': att.match?.danceClass?.trainer?.name ?? 'N/A'
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    worksheet['!cols'] = [
      { wch: 5 },   // N°
      { wch: 18 },  // Fecha Evento
      { wch: 12 },  // Fecha Registro
      { wch: 20 },  // Registrado
      { wch: 15 },  // Estado Asistencia
      { wch: 15 },  // Estado Evento
      { wch: 30 },  // Notas
      { wch: 12 },  // Usuario ID
      { wch: 28 },  // Usuario Email
      { wch: 12 },  // Rol
      { wch: 12 },  // Evento ID
      { wch: 30 },  // Notas Evento
      { wch: 10 },  // Clase ID
      { wch: 28 },  // Clase Nombre
      { wch: 22 }   // Profesor Clase
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencia Eventos')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `asistencia_entrenadores_eventos_${timestamp}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error exporting match trainer attendance to Excel:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar asistencia de eventos de entrenadores a Excel' },
      { status: 500 }
    )
  }
}

