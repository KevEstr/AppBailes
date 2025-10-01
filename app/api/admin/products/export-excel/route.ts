import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

export async function GET(_request: NextRequest) {
  try {
    // Obtener todos los productos con información relevante
    const productDelegate = (prisma as any).product
    const products = await productDelegate.findMany({
      orderBy: { name: 'asc' }
    })

    const getCategoryLabel = (category: string) => {
      const labels: Record<string, string> = {
        JUICES: 'Jugos Naturales',
        SNACKS: 'Snacks',
        BEVERAGES: 'Bebidas',
        FOOD: 'Comida',
        UNIFORMS: 'Uniformes',
        ACCESSORIES: 'Accesorios',
        ADDITIONS: 'Adiciones',
        OTHER: 'Otros'
      }
      return labels[category] || category
    }

    // Preparar datos para Excel
    const formatBogota = (value: Date | string, withTime: boolean) => {
      const date = typeof value === 'string' ? new Date(value) : value
      const options: Intl.DateTimeFormatOptions = withTime
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' }
      return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', ...options }).format(date)
    }
    const excelData = products.map((p: any, index: number) => ({
      'N°': index + 1,
      'ID': p.id,
      'Nombre': p.name,
      'Descripción': p.description || 'N/A',
      'Categoría': p.category ? getCategoryLabel(p.category) : 'N/A',
      'Precio': p.price ?? 0,
      'Stock': p.stock ?? 0,
      'Tipo': p.productType === 'COMPOSITE' ? 'Compuesto' : 'Simple',
      'Activo': p.isActive ? 'Sí' : 'No',
      'Creado': formatBogota(p.createdAt as any, true),
      'Actualizado': formatBogota(p.updatedAt as any, true)
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    worksheet['!cols'] = [
      { wch: 5 },   // N°
      { wch: 8 },   // ID
      { wch: 28 },  // Nombre
      { wch: 40 },  // Descripción
      { wch: 18 },  // Categoría
      { wch: 12 },  // Precio
      { wch: 10 },  // Stock
      { wch: 14 },  // Tipo
      { wch: 10 },  // Activo
      { wch: 20 },  // Creado
      { wch: 20 }   // Actualizado
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `productos_${timestamp}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error exporting products to Excel:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar productos a Excel' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


