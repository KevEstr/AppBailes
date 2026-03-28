import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const dateParam = url.searchParams.get('date')
    const startDateParam = url.searchParams.get('startDate')
    const endDateParam = url.searchParams.get('endDate')
    const userIdParam = url.searchParams.get('userId')
    const searchParam = url.searchParams.get('search')

    const hasDateFilter = !!(dateParam || startDateParam || endDateParam)
    const hasUserFilter = !!userIdParam && userIdParam !== 'all'
    const hasSearchFilter = !!(searchParam && searchParam.trim() !== '')

    if (!hasDateFilter && !hasUserFilter && !hasSearchFilter) {
      return NextResponse.json(
        { success: false, error: 'Debe seleccionar al menos un filtro (fecha, usuario o búsqueda) para exportar' },
        { status: 400 }
      )
    }

    const where: any = {}

    if (hasUserFilter) {
      where.userId = parseInt(userIdParam as string)
    }

    if (hasDateFilter) {
      if (startDateParam || endDateParam) {
        where.date = {}
        if (startDateParam) where.date.gte = new Date(startDateParam + 'T00:00:00-05:00')
        if (endDateParam) where.date.lte = new Date(endDateParam + 'T23:59:59-05:00')
      } else if (dateParam) {
        const startDate = new Date(dateParam as string)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(dateParam as string)
        endDate.setHours(23, 59, 59, 999)
        where.date = { gte: startDate, lte: endDate }
      }
    }

    if (hasSearchFilter) {
      where.OR = [
        { user: { email: { contains: searchParam, mode: 'insensitive' } } },
        { class: { name: { contains: searchParam, mode: 'insensitive' } } },
        { notes: { contains: searchParam, mode: 'insensitive' } }
      ]
    }

    const attendances = await prisma.trainerAttendance.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, role: true } },
        class: { select: { id: true, name: true, trainer: { select: { id: true, name: true } } } }
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }]
    })

    const statusLabel: Record<string, string> = {
      PRESENT: 'Presente',
      LATE: 'Tarde',
      ABSENT: 'Ausente',
      CHANGE_REQUEST: 'Cambio'
    }

    const formatBogota = (value: Date | string, withTime: boolean) => {
      const date = typeof value === 'string' ? new Date(value) : value
      const options: Intl.DateTimeFormatOptions = withTime
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' }
      return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', ...options }).format(date)
    }

    const excelData = attendances.map((att, index) => ({
      'N°': index + 1,
      'Fecha': formatBogota(att.date, false),
      'Registrado': formatBogota(att.createdAt as any, true),
      'Estado': statusLabel[att.status] || att.status,
      'Notas': att.notes || 'N/A',
      'Usuario ID': att.user?.id ?? 'N/A',
      'Usuario Email': att.user?.email ?? 'N/A',
      'Rol': att.user?.role ?? 'N/A',
      'Clase ID': att.class?.id ?? 'N/A',
      'Clase Nombre': att.class?.name ?? 'N/A',
      'Profesor': att.class?.trainer?.name ?? 'N/A'
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    worksheet['!cols'] = [
      { wch: 5 },   // N°
      { wch: 12 },  // Fecha
      { wch: 20 },  // Registrado
      { wch: 12 },  // Estado
      { wch: 30 },  // Notas
      { wch: 12 },  // Usuario ID
      { wch: 28 },  // Usuario Email
      { wch: 12 },  // Rol
      { wch: 10 },  // Clase ID
      { wch: 28 },  // Clase Nombre
      { wch: 22 }   // Profesor
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Asistencia Entrenadores')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `asistencia_entrenadores_${timestamp}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error exporting trainer attendance to Excel:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar asistencia de entrenadores a Excel' },
      { status: 500 }
    )
  }
}


