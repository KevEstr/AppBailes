import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/financial-reports - Obtener reportes financieros o vista consolidada
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view");
    
    // Si se solicita la vista consolidada
    if (view === "consolidated") {
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "50");
      const offset = (page - 1) * limit;
      const search = searchParams.get("search");
      const type = searchParams.get("type");
      const category = searchParams.get("category");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      
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
        queryParams.push(startDate + " 00:00:00"); // Inicio del día
      }
      
      if (endDate) {
        whereConditions.push("transaction_date <= $" + (queryParams.length + 1) + "::timestamp");
        queryParams.push(endDate + " 23:59:59"); // Fin del día
      }
      
      const whereClause = whereConditions.length > 0 
        ? "WHERE " + whereConditions.join(" AND ")
        : "";
      
      // Obtener datos de la vista consolidada con filtros
      const transactions = await prisma.$queryRawUnsafe(`
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
          created_at,
          updated_at
        FROM financial_transactions_view
        ${whereClause}
        ORDER BY transaction_date DESC, created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, ...queryParams);
      
      // Obtener total de registros con filtros
      const totalResult = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as total
        FROM financial_transactions_view
        ${whereClause}
      `, ...queryParams);
      
      const total = parseInt((totalResult as any)[0].total);
      const totalPages = Math.ceil(total / limit);
      
      return NextResponse.json({
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    }
    
    // Endpoint original para reportes financieros
    const year = searchParams.get("year");
    const month = searchParams.get("month");

    let whereClause: any = {};

    if (year && month) {
      whereClause = {
        period: {
          year: parseInt(year),
          month: parseInt(month),
        },
      };
    } else if (year) {
      whereClause = {
        period: {
          year: parseInt(year),
        },
      };
    }

    const reports = await prisma.financialReport.findMany({
      where: whereClause,
      include: {
        period: {
          select: {
            year: true,
            month: true,
          },
        },
      },
      orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching financial data:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST /api/admin/financial-reports - Generar nuevo reporte financiero
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { year, month, reportType = "MONTHLY" } = data;

    if (!year || !month) {
      return NextResponse.json(
        { message: "Año y mes son requeridos" },
        { status: 400 }
      );
    }

    // Crear o encontrar período financiero
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    let period = await prisma.financialPeriod.findUnique({
      where: {
        year_month: {
          year: parseInt(year),
          month: parseInt(month),
        },
      },
    });

    if (!period) {
      period = await prisma.financialPeriod.create({
        data: {
          year: parseInt(year),
          month: parseInt(month),
          startDate,
          endDate,
        },
      });
    }

    // Calcular métricas financieras
    const metrics = await calculateFinancialMetrics(
      period.id,
      startDate,
      endDate
    );

    // Crear o actualizar reporte
    const report = await prisma.financialReport.upsert({
      where: {
        periodId_reportType: {
          periodId: period.id,
          reportType: reportType as any,
        },
      },
      update: {
        ...metrics,
        generatedBy: session.user.name,
        generatedAt: new Date(),
      },
      create: {
        periodId: period.id,
        reportType: reportType as any,
        ...metrics,
        generatedBy: session.user.name,
      },
      include: {
        period: true,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Error generating financial report:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// Función auxiliar para calcular métricas financieras
async function calculateFinancialMetrics(
  periodId: number,
  startDate: Date,
  endDate: Date
) {
  // Ingresos por mensualidades
  const monthlyPaymentsIncome = await prisma.receipt.aggregate({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      concept: {
        contains: "mensualidad",
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Ingresos por servicios (usando receipts con conceptos de servicios)
  const servicePaymentsIncome = await prisma.receipt.aggregate({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      concept: {
        not: {
          contains: "mensualidad",
        },
      },
    },
    _sum: {
      amount: true,
    },
  });

  // Total de ingresos
  const totalIncome =
    (monthlyPaymentsIncome._sum.amount || 0) +
    (servicePaymentsIncome._sum.amount || 0);

  // Por ahora los gastos se calcularán manualmente o desde otra fuente
  const totalExpenses = 0;
  const netProfit = totalIncome - totalExpenses;

  const summary = {
    totalTransactions: await prisma.receipt.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    }),
    averageTransactionAmount:
      totalIncome > 0
        ? totalIncome /
          ((await prisma.receipt.count({
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          })) || 1)
        : 0,
    paymentMethods: await prisma.receipt.groupBy({
      by: ["paymentMethod"],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    }),
  };

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    monthlyPayments: monthlyPaymentsIncome._sum.amount || 0,
    servicePayments: servicePaymentsIncome._sum.amount || 0,
    otherIncome: 0,
    operatingExpenses: 0,
    summary,
  };
}
