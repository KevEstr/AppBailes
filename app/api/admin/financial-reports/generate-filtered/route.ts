import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/admin/financial-reports/generate-filtered - Generar reporte con filtros
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { 
      reportType = "FILTERED",
      reportName,
      filters = {},
      format = "csv"
    } = data;

    const {
      search,
      type,
      category,
      startDate,
      endDate
    } = filters;

    // Construir la consulta con filtros
    let whereConditions = [];
    let queryParams = [];
    
    if (search) {
      whereConditions.push("description ILIKE $" + (queryParams.length + 1));
      queryParams.push(`%${search}%`);
    }
    
    if (type && type !== "ALL") {
      whereConditions.push("transaction_type = $" + (queryParams.length + 1));
      queryParams.push(type);
    }
    
    if (category && category !== "ALL") {
      whereConditions.push("category = $" + (queryParams.length + 1));
      queryParams.push(category);
    }
    
    if (startDate) {
      whereConditions.push("transaction_date >= $" + (queryParams.length + 1) + "::timestamp");
      queryParams.push(startDate + " 00:00:00");
    }
    
    if (endDate) {
      whereConditions.push("transaction_date <= $" + (queryParams.length + 1) + "::timestamp");
      queryParams.push(endDate + " 23:59:59");
    }
    
    const whereClause = whereConditions.length > 0 
      ? "WHERE " + whereConditions.join(" AND ")
      : "";

    // Obtener todas las transacciones que coinciden con los filtros
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
    `, ...queryParams);

    // Calcular totales
    const totalsResult = await prisma.$queryRawUnsafe(`
      SELECT 
        SUM(CASE WHEN transaction_type = 'INCOME' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN transaction_type = 'EXPENSE' THEN amount ELSE 0 END) as total_expense,
        SUM(CASE WHEN transaction_type = 'PENDING_LIABILITY' THEN amount ELSE 0 END) as total_pending_liability,
        COUNT(*) as total_transactions
      FROM financial_transactions_view
      ${whereClause}
    `, ...queryParams);

    const totalsData = (totalsResult as any)[0];
    const totals = {
      total_income: parseFloat(totalsData.total_income || 0),
      total_expense: parseFloat(totalsData.total_expense || 0),
      total_pending_liability: parseFloat(totalsData.total_pending_liability || 0),
      total_transactions: parseInt(totalsData.total_transactions || 0)
    };

    // Preparar datos para exportación
    const transactions = (transactionsRaw as any[]).map((t) => ({
      ...t,
      transaction_date: formatAsBogotaString(t.transaction_date),
      created_at: formatAsBogotaString(t.created_at),
      updated_at: formatAsBogotaString(t.updated_at),
    }));

    // Crear resumen del reporte
    const reportSummary = {
      reportType,
      reportName: reportName || `Reporte ${reportType} - ${new Date().toLocaleDateString()}`,
      generatedAt: new Date(),
      generatedBy: session.user.name,
      filters: {
        search: search || null,
        type: type || null,
        category: category || null,
        startDate: startDate || null,
        endDate: endDate || null
      },
      totals,
      transactionCount: transactions.length
    };

    // Guardar el reporte en la base de datos
    const savedReport = await prisma.financialReport.create({
      data: {
        reportType: reportType as any,
        totalIncome: totals.total_income,
        totalExpenses: totals.total_expense,
        netProfit: totals.total_income - totals.total_expense,
        monthlyPayments: 0, // Se calculará si es necesario
        servicePayments: 0, // Se calculará si es necesario
        generatedBy: session.user.name,
        periodId: null, // No asociado a un período específico
        summary: {
          filters,
          totals,
          transactionCount: transactions.length
        }
      }
    });

    return NextResponse.json({
      success: true,
      report: savedReport,
      summary: reportSummary,
      transactions,
      totals,
      format
    });

  } catch (error) {
    console.error("Error generating filtered report:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Formatea un valor Date o string a 'YYYY-MM-DDTHH:mm:ss.SSS-05:00' en zona 'America/Bogota'
function formatAsBogotaString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  try {
    // Obtener partes en zona horaria de Bogotá
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);

    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const hour = get('hour');
    const minute = get('minute');
    const second = get('second');

    return `${year}-${month}-${day}T${hour}:${minute}:${second}-05:00`;
  } catch {
    return date.toISOString();
  }
}
