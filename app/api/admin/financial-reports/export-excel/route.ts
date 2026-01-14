import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function formatDate(date: Date | string | null | undefined) {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('es-CO', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const url = new URL(request.url)
    const search = url.searchParams.get('search') || ''
    const type = url.searchParams.get('type') || ''
    const category = url.searchParams.get('category') || ''
    const startDate = url.searchParams.get('startDate') || ''
    const endDate = url.searchParams.get('endDate') || ''

    const hasSearch = !!search
    const hasType = !!(type && type !== 'ALL')
    const hasCategory = !!(category && category !== 'ALL')
    const hasDate = !!(startDate || endDate)

    if (!hasSearch && !hasType && !hasCategory && !hasDate) {
      return NextResponse.json(
        { success: false, error: 'Seleccione al menos un filtro (fecha, tipo, categoría o búsqueda) para exportar' },
        { status: 400 }
      )
    }

    // Build filters for raw SQL (same as consolidated view)
    const whereConditions: string[] = []
    const queryParams: any[] = []

    if (hasSearch) {
      whereConditions.push(`description ILIKE $${queryParams.length + 1}`)
      queryParams.push(`%${search}%`)
    }
    if (hasType) {
      whereConditions.push(`transaction_type = $${queryParams.length + 1}`)
      queryParams.push(type)
    }
    if (hasCategory) {
      whereConditions.push(`category = $${queryParams.length + 1}`)
      queryParams.push(category)
    }
    if (startDate) {
      whereConditions.push(`transaction_date >= $${queryParams.length + 1}::timestamp`)
      queryParams.push(`${startDate} 00:00:00`)
    }
    if (endDate) {
      whereConditions.push(`transaction_date <= $${queryParams.length + 1}::timestamp`)
      queryParams.push(`${endDate} 23:59:59`)
    }

    const whereClause = whereConditions.length ? `WHERE ${whereConditions.join(' AND ')}` : ''

    const transactionsRaw = await prisma.$queryRawUnsafe(`
      SELECT 
        source_table,
        transaction_id,
        amount,
        description,
        transaction_type,
        category,
        transaction_date,
        payment_method,
        student_id,
        period_id,
        related_id,
        related_type,
        user_id,
        user_name,
        created_at,
        updated_at
      FROM financial_transactions_view
      ${whereClause}
      ORDER BY transaction_date DESC, created_at DESC
    `, ...queryParams)

    const transactions = (transactionsRaw as any[]).map(t => ({
      ...t,
      transaction_date: t.transaction_date,
      created_at: t.created_at,
      updated_at: t.updated_at
    }))

    // Prepare Excel data
    const getSourceLabel = (s: string) => {
      const map: Record<string, string> = {
        RECEIPT: 'Recibo',
        DEBT: 'Deuda',
        MONTHLY_PAYMENT: 'Mensualidad',
        PAYMENT_PROOF: 'Comprobante',
        ENROLLMENT_PAYMENT: 'Inscripción',
        ENROLLMENT_PAYMENT_PROOF: 'Comp. Inscripción',
        PRODUCT_SALE: 'Venta',
        SERVICE_PAYMENT: 'Servicio',
        FINANCIAL_TRANSACTION: 'Transacción',
        EQUIPMENT: 'Equipos',
        MARKETING: 'Marketing',
        RENT: 'Alquiler',
        UTILITIES: 'Servicios Públicos',
        SALARIES: 'Salarios',
        PURCHASES: 'Compras',
        OTHER_INCOME: 'Otros Ingresos',
        OTHER_EXPENSE: 'Otros Gastos'
      }
      return map[s] || s
    }
    const getTypeLabel = (t: string) => ({
      INCOME: 'Ingreso', EXPENSE: 'Egreso', PENDING_LIABILITY: 'Pasivo Pendiente', PENDING_REVIEW: 'Pendiente Revisión', REJECTED: 'Rechazado', CANCELLED: 'Cancelado', FAILED: 'Fallido'
    } as Record<string,string>)[t] || t
    const getPaymentLabel = (p?: string|null) => ({ CASH: 'Efectivo', TRANSFER: 'Transferencia', CARD: 'Tarjeta' } as Record<string,string>)[p || ''] || (p || '-')

    const excelTransactions = transactions.map(t => ({
      'Origen': getSourceLabel(t.source_table),
      'Descripción': t.description,
      'Tipo': getTypeLabel(t.transaction_type),
      'Categoría': getSourceLabel(t.category),
      'Monto': t.amount,
      'Método de Pago': getPaymentLabel(t.payment_method),
      'Fecha': formatDate(t.transaction_date),
      'Usuario': t.user_name || '-',
      'ID Transacción': t.transaction_id
    }))

    const workbook = XLSX.utils.book_new()

    // Summary sheet
    const totalIncome = transactions.filter(t => t.transaction_type === 'INCOME').reduce((s,t)=>s + Number(t.amount), 0)
    const totalExpense = transactions.filter(t => t.transaction_type === 'EXPENSE').reduce((s,t)=>s + Number(t.amount), 0)
    const totalPending = transactions.filter(t => t.transaction_type === 'PENDING_LIABILITY').reduce((s,t)=>s + Number(t.amount), 0)

    const summaryRows = [
      ['REPORTE FINANCIERO - CONSOLIDADO'],
      [''],
      ['Información del Reporte'],
      ['Generado:', formatDate(new Date())],
      ['Total de transacciones:', transactions.length],
      [''],
      ['Filtros Aplicados'],
      ['Búsqueda:', hasSearch ? search : 'Ninguno'],
      ['Tipo:', hasType ? getTypeLabel(type) : 'Todos'],
      ['Categoría:', hasCategory ? getSourceLabel(category) : 'Todas'],
      ['Fecha inicio:', startDate || 'Sin límite'],
      ['Fecha fin:', endDate || 'Sin límite'],
      [''],
      ['Resumen Financiero'],
      ['Total Ingresos:', totalIncome],
      ['Total Egresos:', totalExpense],
      ['Pasivos Pendientes:', totalPending],
      ['Balance Neto:', totalIncome - totalExpense]
    ]

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen')

    // Transactions sheet
    const txSheet = XLSX.utils.json_to_sheet(excelTransactions)
    XLSX.utils.book_append_sheet(workbook, txSheet, 'Transacciones')

    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })
    const filename = `consolidado-financiero-${new Date().toISOString().slice(0,10)}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error exporting consolidated financial data:', error)
    return NextResponse.json({ success: false, error: 'Error al exportar a Excel' }, { status: 500 })
  }
}


