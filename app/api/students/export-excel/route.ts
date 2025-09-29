import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Obtener todos los estudiantes con información completa
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        enrollmentData: true,
        classEnrollments: {
          where: { isActive: true },
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
                },
                schedules: {
                  where: { isActive: true },
                  orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
                }
              }
            }
          }
        },
        _count: {
          select: {
            classEnrollments: { where: { isActive: true } },
            debts: { where: { isPaid: false } },
            monthlyPayments: { where: { status: 'PENDING' } },
            receipts: true,
            attendances: true
          }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
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

    // Función helper para obtener nombre del día
    const getDayName = (dayOfWeek: number) => {
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
      return days[dayOfWeek] || "Desconocido"
    }

    // Función helper para obtener nombre del rol
    const getRoleDisplayName = (role: string) => {
      switch (role) {
        case "ADMIN": return "Admin"
        case "TEACHER": return "Profesor"
        case "STUDENT": return "Deportista"
        default: return role
      }
    }


    // Preparar datos para Excel
    const excelData = students.map((student, index) => {
      // Información básica del estudiante
      const basicInfo = {
        'N°': index + 1,
        'ID Estudiante': student.id,
        'Nombre': student.name,
        'Teléfono': student.phone,
        'Estado': student.isActive ? 'Activo' : 'Inactivo',
        'Tiene Deuda': student.hasDebt ? 'Sí' : 'No',
        'Fecha Registro': new Date(student.createdAt).toLocaleDateString('es-ES', {
          year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
        })
      }

      // Información del usuario
      const userInfo = {
        'Email Usuario': student.user?.email || 'Sin email',
        'Rol Usuario': student.user ? getRoleDisplayName(student.user.role) : 'Sin usuario',
        'Usuario Activo': student.user?.isActive ? 'Sí' : 'No',
        'Fecha Creación Usuario': student.user?.createdAt ? 
          new Date(student.user.createdAt).toLocaleDateString('es-ES', {
            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
          }) : 'Sin fecha'
      }

      // Información de inscripción
      const enrollmentInfo = {
        'Tipo Documento': student.enrollmentData?.documentType || 'No especificado',
        'Fecha Nacimiento': student.enrollmentData?.birthDate || 'No especificada',
        'Dirección': student.enrollmentData?.address || 'Sin dirección',
        'Barrio': student.enrollmentData?.neighborhood || 'Sin barrio',
        'Ciudad': student.enrollmentData?.city || 'Sin ciudad',
        'Tiene SISBEN': student.enrollmentData?.hasSisben ? 'Sí' : 'No',
        'EPS': student.enrollmentData?.eps || 'Sin EPS',
        'Tipo Sangre': student.enrollmentData?.bloodType || 'Sin especificar',
        'Tiene Restricciones': student.enrollmentData?.hasRestrictions ? 'Sí' : 'No',
        'Descripción Restricciones': student.enrollmentData?.restrictionsDescription || 'Sin restricciones',
        'Condiciones Médicas': student.enrollmentData?.medicalConditions || 'Sin condiciones',
        'Es Adulto': student.enrollmentData?.isAdult ? 'Sí' : 'No',
        'Mensualidad': student.enrollmentData?.monthlyFee ? `$${student.enrollmentData.monthlyFee.toLocaleString()}` : 'Sin especificar',
        'Número Camiseta': student.enrollmentData?.jerseyNumber || 'Sin número'
      }

      // Información de contacto de emergencia
      const emergencyInfo = {
        'Contacto Emergencia': student.enrollmentData?.emergencyContactName || 'Sin contacto',
        'Relación Emergencia': student.enrollmentData?.emergencyContactRelation || 'Sin relación',
        'Teléfono Emergencia': student.enrollmentData?.emergencyContactPhone || 'Sin teléfono',
        // Guardian fields removed - using emergency contact instead
        'Teléfono Contacto': student.enrollmentData?.emergencyContactPhone || 'Sin teléfono'
      }

      // Información de clases
      const classesInfo = {
        'Cantidad Clases': student._count.classEnrollments,
        'Cantidad Deudas': student._count.debts,
        'Pagos Pendientes': student._count.monthlyPayments,
        'Total Recibos': student._count.receipts,
        'Total Asistencias': student._count.attendances
      }

      // Información de la primera clase (si existe)
      const firstClass = student.classEnrollments[0]?.danceClass
      const classInfo = firstClass ? {
        'Clase Principal': firstClass.name,
        'Deporte': getSportDisplayName(firstClass.sport),
        'Nivel': getLevelDisplayName(firstClass.level),
        'Profesor': firstClass.trainer.name,
        'Teléfono Profesor': firstClass.trainer.phone,
        'Ubicación': firstClass.location?.name || 'Sin ubicación',
        'Dirección Ubicación': firstClass.location?.address || 'Sin dirección',
        'Horarios': firstClass.schedules
          .map(schedule => `${getDayName(schedule.dayOfWeek)}: ${schedule.startTime} - ${schedule.endTime}`)
          .join('; ') || 'Sin horarios'
      } : {
        'Clase Principal': 'Sin clases',
        'Deporte': 'Sin deporte',
        'Nivel': 'Sin nivel',
        'Profesor': 'Sin profesor',
        'Teléfono Profesor': 'Sin teléfono',
        'Ubicación': 'Sin ubicación',
        'Dirección Ubicación': 'Sin dirección',
        'Horarios': 'Sin horarios'
      }

      // Combinar toda la información
      return {
        ...basicInfo,
        ...userInfo,
        ...enrollmentInfo,
        ...emergencyInfo,
        ...classesInfo,
        ...classInfo
      }
    })

    // Crear workbook y worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Configurar anchos de columna
    const columnWidths = [
      { wch: 5 },   // N°
      { wch: 15 },  // ID Estudiante
      { wch: 25 },  // Nombre
      { wch: 15 },  // Teléfono
      { wch: 10 },  // Estado
      { wch: 12 },  // Tiene Deuda
      { wch: 20 },  // Fecha Registro
      { wch: 30 },  // Email Usuario
      { wch: 15 },  // Rol Usuario
      { wch: 15 },  // Usuario Activo
      { wch: 25 },  // Fecha Creación Usuario
      { wch: 15 },  // Tipo Documento
      { wch: 15 },  // Fecha Nacimiento
      { wch: 30 },  // Dirección
      { wch: 20 },  // Barrio
      { wch: 15 },  // Ciudad
      { wch: 12 },  // Tiene SISBEN
      { wch: 20 },  // EPS
      { wch: 15 },  // Tipo Sangre
      { wch: 18 },  // Tiene Restricciones
      { wch: 30 },  // Descripción Restricciones
      { wch: 25 },  // Condiciones Médicas
      { wch: 10 },  // Es Adulto
      { wch: 15 },  // Mensualidad
      { wch: 15 },  // Número Camiseta
      { wch: 25 },  // Contacto Emergencia
      { wch: 20 },  // Relación Emergencia
      { wch: 18 },  // Teléfono Emergencia
      { wch: 20 },  // Nombre Acudiente
      { wch: 18 },  // Relación Acudiente
      { wch: 18 },  // Teléfono Acudiente
      { wch: 15 },  // Cantidad Clases
      { wch: 15 },  // Cantidad Deudas
      { wch: 18 },  // Pagos Pendientes
      { wch: 15 },  // Total Recibos
      { wch: 18 },  // Total Asistencias
      { wch: 25 },  // Clase Principal
      { wch: 15 },  // Deporte
      { wch: 15 },  // Nivel
      { wch: 25 },  // Profesor
      { wch: 18 },  // Teléfono Profesor
      { wch: 20 },  // Ubicación
      { wch: 30 },  // Dirección Ubicación
      { wch: 50 }   // Horarios
    ]

    worksheet['!cols'] = columnWidths

    // Añadir worksheet al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes')

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    // Crear nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `estudiantes_consolidado_${timestamp}.xlsx`

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
    console.error('Error exporting students to Excel:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar estudiantes a Excel' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
