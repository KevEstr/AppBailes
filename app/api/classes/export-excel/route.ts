import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Obtener todas las clases activas con información completa
    const classes = await prisma.danceClass.findMany({
      where: {
        isActive: true
      },
      include: {
        trainer: {
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
        location: {
          select: {
            id: true,
            name: true,
            address: true
          }
        },
        schedules: {
          where: { isActive: true },
          orderBy: [
            { dayOfWeek: 'asc' },
            { startTime: 'asc' }
          ]
        },
        _count: {
          select: {
            enrollments: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: [
        { sport: 'asc' },
        { name: 'asc' }
      ]
    })

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

    // Función para obtener días de la semana en español
    const getDayName = (dayOfWeek: number) => {
      const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
      return days[dayOfWeek] || "Desconocido"
    }

    // Preparar datos para Excel
    const excelData = classes.map((danceClass, index) => {
      // Combinar todos los horarios en una sola cadena
      const schedulesText = danceClass.schedules
        .map(schedule => `${getDayName(schedule.dayOfWeek)}: ${schedule.startTime} - ${schedule.endTime}`)
        .join('; ')

      return {
        'N°': index + 1,
        'ID': danceClass.id,
        'Nombre': danceClass.name,
        'Descripción': danceClass.description || 'Sin descripción',
        'Deporte': getSportDisplayName(danceClass.sport),
        'Nivel': getLevelDisplayName(danceClass.level),
        'Profesor/Entrenador': danceClass.trainer.name,
        'Email Profesor': danceClass.trainer.user?.email || 'Sin email',
        'Teléfono Profesor': danceClass.trainer.phone || 'Sin teléfono',
        'Ubicación': danceClass.location?.name || 'Sin ubicación',
        'Dirección': danceClass.location?.address || 'Sin dirección',
        'Capacidad': danceClass.capacity,
        'Inscritos': danceClass._count.enrollments,
        'Disponibilidad': `${danceClass._count.enrollments}/${danceClass.capacity}`,
        'Horarios': schedulesText,
        'Estado': danceClass.isActive ? 'Activa' : 'Inactiva'
      }
    })

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new()
    
    // Crear hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Configurar ancho de columnas
    const columnWidths = [
      { wch: 5 },   // N°
      { wch: 8 },   // ID
      { wch: 25 },  // Nombre
      { wch: 30 },  // Descripción
      { wch: 15 },  // Deporte
      { wch: 12 },  // Nivel
      { wch: 20 },  // Profesor/Entrenador
      { wch: 25 },  // Email Profesor
      { wch: 15 },  // Teléfono Profesor
      { wch: 20 },  // Ubicación
      { wch: 30 },  // Dirección
      { wch: 10 },  // Capacidad
      { wch: 10 },  // Inscritos
      { wch: 15 },  // Disponibilidad
      { wch: 12 },  // Precio
      { wch: 50 },  // Horarios
      { wch: 18 },  // Cantidad de Horarios
      { wch: 10 }   // Estado
    ]
    worksheet['!cols'] = columnWidths

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Clases')

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    })

    // Crear nombre de archivo con timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `clases_${timestamp}.xlsx`

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
    console.error('Error exporting classes to Excel:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al exportar clases a Excel' 
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
