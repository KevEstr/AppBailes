import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const searchParam = url.searchParams.get('search')
    const dateFromParam = url.searchParams.get('dateFrom')
    const dateToParam = url.searchParams.get('dateTo')

    // ✅ VALIDACIÓN: Exigir al menos un filtro de fecha para evitar descargas masivas
    if (!dateFromParam && !dateToParam) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Debe seleccionar al menos una fecha (desde o hasta) para exportar las transferencias' 
        },
        { status: 400 }
      )
    }

    // Construir filtros de fecha con manejo correcto de zona horaria Colombia (-5)
    const where: any = {
      transferredAt: {}
    }
    
    if (dateFromParam) {
      // Crear fecha en zona horaria de Colombia (UTC-5)
      const fromDate = new Date(dateFromParam + 'T00:00:00-05:00')
      where.transferredAt.gte = fromDate
    }
    
    if (dateToParam) {
      // Crear fecha en zona horaria de Colombia (UTC-5) hasta el final del día
      const toDate = new Date(dateToParam + 'T23:59:59-05:00')
      where.transferredAt.lte = toDate
    }

    // Obtener todas las transferencias con información completa
    const transfers = await prisma.studentTransfer.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        fromClass: {
          select: {
            id: true,
            name: true,
            sport: true,
            level: true,
            trainer: {
              select: {
                name: true
              }
            }
          }
        },
        toClass: {
          select: {
            id: true,
            name: true,
            sport: true,
            level: true,
            trainer: {
              select: {
                name: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            student: {
              select: {
                name: true
              }
            },
            trainer: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        transferredAt: 'desc'
      }
    })

    // Aplicar filtro de búsqueda si existe
    let filteredTransfers = transfers
    if (searchParam && searchParam.trim()) {
      const searchTerm = searchParam.trim().toLowerCase()
      filteredTransfers = transfers.filter(transfer => 
        transfer.student.name.toLowerCase().includes(searchTerm) ||
        transfer.fromClass.name.toLowerCase().includes(searchTerm) ||
        transfer.toClass.name.toLowerCase().includes(searchTerm) ||
        transfer.fromClass.trainer.name.toLowerCase().includes(searchTerm) ||
        transfer.toClass.trainer.name.toLowerCase().includes(searchTerm) ||
        transfer.user.email.toLowerCase().includes(searchTerm) ||
        (transfer.user.student?.name && transfer.user.student.name.toLowerCase().includes(searchTerm)) ||
        (transfer.user.trainer?.name && transfer.user.trainer.name.toLowerCase().includes(searchTerm))
      )
    }

    // Función para mapear deportes a español
    const getSportDisplayName = (sport: string) => {
      switch (sport) {
        case "DANCE":
          return "Baile"
        case "VOLLEYBALL":
          return "Voleibol"
        default:
          return sport
      }
    }

    // Función para mapear niveles a español
    const getLevelDisplayName = (level: string) => {
      switch (level) {
        case "BEGINNER":
          return "Principiante"
        case "INTERMEDIATE":
          return "Intermedio"
        case "ADVANCED":
          return "Avanzado"
        default:
          return level || "No especificado"
      }
    }

    // Función para obtener el nombre del usuario que realizó la transferencia
    const getUserDisplayName = (user: any) => {
      if (user.student?.name) return user.student.name
      if (user.trainer?.name) return user.trainer.name
      return user.email
    }

    // Función para mapear roles a español
    const getRoleDisplayName = (role: string) => {
      switch (role) {
        case "ADMIN":
          return "Admin"
        case "TEACHER":
          return "Profesor"
        case "STUDENT":
          return "Deportista"
        default:
          return role
      }
    }

    // Preparar datos para Excel
    const excelData = filteredTransfers.map((transfer, index) => ({
      'N°': index + 1,
      'ID': transfer.id,
      'Estudiante': transfer.student.name,
      'Cédula': transfer.student.id,
      'Teléfono': transfer.student.phone || 'Sin teléfono',
      'Email Estudiante': transfer.student.user?.email || 'Sin email',
      'Clase de Origen': transfer.fromClass.name,
      'Deporte Origen': getSportDisplayName(transfer.fromClass.sport),
      'Nivel Origen': getLevelDisplayName(transfer.fromClass.level),
      'Profesor Origen': transfer.fromClass.trainer.name,
      'Clase de Destino': transfer.toClass.name,
      'Deporte Destino': getSportDisplayName(transfer.toClass.sport),
      'Nivel Destino': getLevelDisplayName(transfer.toClass.level),
      'Profesor Destino': transfer.toClass.trainer.name,
      'Transferido por': getUserDisplayName(transfer.user),
      'Rol': getRoleDisplayName(transfer.user.role),
      'Email Usuario': transfer.user.email,
      'Motivo': transfer.reason || 'Sin motivo especificado',
      'Fecha de Transferencia': new Date(transfer.transferredAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }))

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new()
    
    // Crear hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Configurar ancho de columnas
    const columnWidths = [
      { wch: 5 },   // N°
      { wch: 8 },   // ID
      { wch: 20 },  // Estudiante
      { wch: 15 },  // Cédula
      { wch: 15 },  // Teléfono
      { wch: 25 },  // Email Estudiante
      { wch: 25 },  // Clase de Origen
      { wch: 15 },  // Deporte Origen
      { wch: 12 },  // Nivel Origen
      { wch: 20 },  // Profesor Origen
      { wch: 25 },  // Clase de Destino
      { wch: 15 },  // Deporte Destino
      { wch: 12 },  // Nivel Destino
      { wch: 20 },  // Profesor Destino
      { wch: 20 },  // Transferido por
      { wch: 12 },  // Rol
      { wch: 25 },  // Email Usuario
      { wch: 30 },  // Motivo
      { wch: 20 }   // Fecha de Transferencia
    ]
    worksheet['!cols'] = columnWidths

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transferencias')

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    })

    // Crear nombre de archivo con timestamp y filtros
    const timestamp = new Date().toISOString().split('T')[0]
    let filename = `transferencias_${timestamp}.xlsx`
    
    if (dateFromParam && dateToParam) {
      filename = `transferencias_${dateFromParam}_a_${dateToParam}.xlsx`
    } else if (dateFromParam) {
      filename = `transferencias_desde_${dateFromParam}.xlsx`
    } else if (dateToParam) {
      filename = `transferencias_hasta_${dateToParam}.xlsx`
    }

    // Retornar archivo Excel
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Error exporting transfers to Excel:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al exportar transferencias a Excel' 
      },
      { status: 500 }
    )
  }
}
