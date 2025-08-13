import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST /api/admin/financial-transactions - Crear nueva transacción financiera
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { type, category, amount, description, paymentMethod, paymentDate, notes } = data;

    // Validaciones
    if (!type || !category || !amount || !description || !paymentMethod || !paymentDate) {
      return NextResponse.json(
        { message: "Todos los campos obligatorios son requeridos" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { message: "El monto debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Obtener o crear el período financiero actual
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let period = await prisma.financialPeriod.findUnique({
      where: {
        year_month: {
          year: currentYear,
          month: currentMonth,
        },
      },
    });

    if (!period) {
      const startDate = new Date(currentYear, currentMonth - 1, 1);
      const endDate = new Date(currentYear, currentMonth, 0);
      
      period = await prisma.financialPeriod.create({
        data: {
          year: currentYear,
          month: currentMonth,
          startDate,
          endDate,
        },
      });
    }

    // Crear la transacción financiera
    const transaction = await prisma.financialTransaction.create({
      data: {
        periodId: period.id,
        type: type as any,
        category: category as any,
        amount: parseFloat(amount),
        description,
        reference: notes || null,
        paymentMethod: paymentMethod as any,
        date: new Date(`${paymentDate}T12:00:00-05:00`), // Forzar zona horaria de Colombia (UTC-5)
        studentId: null, // Los egresos no están asociados a estudiantes específicos
        relatedId: null,
        relatedType: null,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Error creating financial transaction:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// GET /api/admin/financial-transactions - Obtener transacciones financieras
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;
    const type = searchParams.get("type");
    const category = searchParams.get("category");

    let whereClause: any = {};

    if (type && type !== "ALL") {
      whereClause.type = type;
    }

    if (category && category !== "ALL") {
      whereClause.category = category;
    }

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where: whereClause,
        include: {
          period: true,
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
        skip: offset,
        take: limit,
      }),
      prisma.financialTransaction.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching financial transactions:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
} 