import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET /api/admin/financial-reports - Obtener reportes financieros
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
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
        period: true,
      },
      orderBy: [{ period: { year: "desc" } }, { period: { month: "desc" } }],
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching financial reports:", error);
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
