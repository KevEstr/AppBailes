import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/financial-reports/[id]/download - Descargar reporte completo
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const reportId = parseInt(params.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ message: "ID de reporte inválido" }, { status: 400 });
    }

    // Obtener el reporte
    const report = await prisma.financialReport.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return NextResponse.json({ message: "Reporte no encontrado" }, { status: 404 });
    }

    // Si es un reporte filtrado, regenerar los datos con los filtros originales
    if (report.reportType === "FILTERED" && report.summary) {
      const summary = report.summary as any;
      const filters = summary.filters || {};

      // Construir la consulta con los filtros originales
      let whereConditions = [];
      let queryParams = [];
      
      if (filters.search) {
        whereConditions.push("description ILIKE $" + (queryParams.length + 1));
        queryParams.push(`%${filters.search}%`);
      }
      
      if (filters.type && filters.type !== "ALL") {
        whereConditions.push("transaction_type = $" + (queryParams.length + 1));
        queryParams.push(filters.type);
      }
      
      if (filters.category && filters.category !== "ALL") {
        whereConditions.push("category = $" + (queryParams.length + 1));
        queryParams.push(filters.category);
      }
      
      if (filters.startDate) {
        whereConditions.push("transaction_date >= $" + (queryParams.length + 1) + "::timestamp");
        queryParams.push(filters.startDate + " 00:00:00");
      }
      
      if (filters.endDate) {
        whereConditions.push("transaction_date <= $" + (queryParams.length + 1) + "::timestamp");
        queryParams.push(filters.endDate + " 23:59:59");
      }
      
      const whereClause = whereConditions.length > 0 
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

      // Obtener todas las transacciones que coinciden con los filtros originales
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

      // Preparar datos para exportación
      const transactions = (transactionsRaw as any[]).map((t) => ({
        ...t,
        transaction_date: formatAsBogotaString(t.transaction_date),
        created_at: formatAsBogotaString(t.created_at),
        updated_at: formatAsBogotaString(t.updated_at),
      }));

      return NextResponse.json({
        success: true,
        report,
        transactions,
        summary: {
          reportType: report.reportType,
          reportName: `Reporte Filtrado - ${new Date(report.generatedAt).toLocaleDateString()}`,
          generatedAt: report.generatedAt,
          generatedBy: report.generatedBy,
          filters: summary.filters,
          totals: summary.totals,
          transactionCount: transactions.length
        }
      });
    } else {
      // Para reportes periódicos, obtener datos del período
      if (report.periodId) {
        const period = await prisma.financialPeriod.findUnique({
          where: { id: report.periodId }
        });

        if (period) {
          // Obtener transacciones del período
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
            WHERE transaction_date >= $1::timestamp AND transaction_date <= $2::timestamp
            ORDER BY transaction_date DESC, created_at DESC
          `, period.startDate, period.endDate);

          const transactions = (transactionsRaw as any[]).map((t) => ({
            ...t,
            transaction_date: formatAsBogotaString(t.transaction_date),
            created_at: formatAsBogotaString(t.created_at),
            updated_at: formatAsBogotaString(t.updated_at),
          }));

          return NextResponse.json({
            success: true,
            report,
            transactions,
            summary: {
              reportType: report.reportType,
              reportName: `Reporte ${report.reportType} - ${period.month}/${period.year}`,
              generatedAt: report.generatedAt,
              generatedBy: report.generatedBy,
              period: { year: period.year, month: period.month },
              totals: {
                total_income: report.totalIncome,
                total_expense: report.totalExpenses,
                total_pending_liability: 0
              },
              transactionCount: transactions.length
            }
          });
        }
      }

      // Fallback para reportes sin período
      return NextResponse.json({
        success: true,
        report,
        transactions: [],
        summary: {
          reportType: report.reportType,
          reportName: `Reporte ${report.reportType}`,
          generatedAt: report.generatedAt,
          generatedBy: report.generatedBy,
          totals: {
            total_income: report.totalIncome,
            total_expense: report.totalExpenses,
            total_pending_liability: 0
          },
          transactionCount: 0
        }
      });
    }

  } catch (error) {
    console.error("Error downloading report:", error);
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
