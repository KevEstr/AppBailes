import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    // Obtener todos los usuarios con información básica
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

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
    const excelData = users.map((user, index) => {
      // Obtener el nombre del usuario desde student o trainer según el rol
      let userName = 'Sin nombre'
      if (user.role === 'STUDENT' && user.student?.name) {
        userName = user.student.name
      } else if (user.role === 'TEACHER' && user.trainer?.name) {
        userName = user.trainer.name
      } else if (user.role === 'ADMIN') {
        userName = 'Administrador'
      }

      return {
        'N°': index + 1,
        'ID': user.id,
        'Nombre': userName,
        'Email': user.email,
        'Rol': getRoleDisplayName(user.role),
        'Estado': user.isActive ? 'Activo' : 'Inactivo',
        'Entrenador': user.trainer?.name || 'Sin asignar',
        'Fecha de Registro': new Date(user.createdAt).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })
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
      { wch: 30 },  // Email
      { wch: 15 },  // Rol
      { wch: 10 },  // Estado
      { wch: 20 },  // Entrenador
      { wch: 20 }   // Fecha de Registro
    ]
    worksheet['!cols'] = columnWidths

    // Agregar hoja al libro
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios')

    // Generar buffer del archivo Excel
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    })

    // Crear nombre de archivo con timestamp
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `usuarios_${timestamp}.xlsx`

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
    console.error('Error exporting users to Excel:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al exportar usuarios a Excel' 
      },
      { status: 500 }
    )
  }
}
