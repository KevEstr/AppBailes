import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const movementType = url.searchParams.get('movementType')
    const productId = url.searchParams.get('productId')
    const search = url.searchParams.get('search') || ''

    const hasDateFilter = !!(dateFrom || dateTo)
    const hasMovementTypeFilter = !!(movementType && movementType !== 'all')
    const hasProductFilter = !!(productId && productId !== 'all')
    const hasSearchFilter = !!(search && search.trim() !== '')

    if (!hasDateFilter && !hasMovementTypeFilter && !hasProductFilter && !hasSearchFilter) {
      return NextResponse.json(
        { success: false, error: 'Debe seleccionar al menos un filtro (fecha, tipo, producto o búsqueda) para exportar los movimientos' },
        { status: 400 }
      )
    }

    const where: any = {}

    if (hasSearchFilter) {
      where.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { reason: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (hasMovementTypeFilter) {
      where.movementType = movementType
    }

    if (hasProductFilter) {
      where.productId = parseInt(productId as string)
    }

    if (hasDateFilter) {
      where.createdAt = {}
      if (dateFrom) {
        // Colombia (UTC-5) start of day
        where.createdAt.gte = new Date(dateFrom + 'T00:00:00-05:00')
      }
      if (dateTo) {
        // Colombia (UTC-5) end of day
        where.createdAt.lte = new Date(dateTo + 'T23:59:59-05:00')
      }
    }

    const movements = await prisma.inventoryMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category: true,
            productType: true
          }
        },
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const typeLabel: Record<string, string> = {
      PURCHASE: 'Compra',
      SALE: 'Venta',
      ADJUSTMENT: 'Ajuste',
      WASTE: 'Desperdicio',
      TRANSFER: 'Transferencia',
      RETURN: 'Devolución'
    }

    const reasonLabel: Record<string, string> = {
      PURCHASE: 'Compra',
      ADJUSTMENT: 'Ajuste de Inventario',
      WASTE: 'Pérdida/Desperdicio',
      TRANSFER: 'Transferencia',
      RETURN: 'Devolución',
      SALE: 'Venta'
    }

    const productTypeLabel: Record<string, string> = {
      COMPOSITE: 'Compuesto',
      SIMPLE: 'Simple'
    }

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

    const formatBogota = (value: Date | string, withTime: boolean) => {
      const date = typeof value === 'string' ? new Date(value) : value
      const options: Intl.DateTimeFormatOptions = withTime
        ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
        : { year: 'numeric', month: '2-digit', day: '2-digit' }
      return new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', ...options }).format(date)
    }

    const excelData = movements.map((m, index) => ({
      'N°': index + 1,
      'ID Movimiento': m.id,
      'Fecha': formatBogota(m.createdAt as any, true),
      'Tipo': typeLabel[m.movementType] || m.movementType,
      'Cantidad': m.quantity,
      'Motivo': m.reason ? (reasonLabel[m.reason] || m.reason) : 'N/A',
      'Referencia': m.reference || 'N/A',
      'Notas': m.notes || 'N/A',
      'ID Producto': m.product?.id || 'N/A',
      'Producto': m.product?.name || 'N/A',
      'Categoría': m.product?.category ? getCategoryLabel(m.product.category as string) : 'N/A',
      'Tipo Producto': m.product?.productType ? (productTypeLabel[m.product.productType] || m.product.productType) : 'N/A',
      'Procesado Por (ID)': m.user?.id || 'N/A',
      'Procesado Por (Email)': m.user?.email || 'N/A'
    }))

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    worksheet['!cols'] = [
      { wch: 5 },   // N°
      { wch: 14 },  // ID Movimiento
      { wch: 20 },  // Fecha
      { wch: 14 },  // Tipo
      { wch: 10 },  // Cantidad
      { wch: 22 },  // Motivo
      { wch: 20 },  // Referencia
      { wch: 30 },  // Notas
      { wch: 12 },  // ID Producto
      { wch: 28 },  // Producto
      { wch: 18 },  // Categoría
      { wch: 16 },  // Tipo Producto
      { wch: 18 },  // Procesado Por (ID)
      { wch: 28 }   // Procesado Por (Email)
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Movimientos')
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `inventario_movimientos_${timestamp}.xlsx`

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error exporting inventory movements to Excel:', error)
    return NextResponse.json(
      { success: false, error: 'Error al exportar movimientos a Excel' },
      { status: 500 }
    )
  }
}


