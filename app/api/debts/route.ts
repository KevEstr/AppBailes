import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// ⚡ CACHE EN MEMORIA PARA CONSULTAS FRECUENTES
let debtsCache: {
  data: any;
  timestamp: number;
  count: number;
} | null = null;

const CACHE_DURATION = 60 * 1000; // 1 minuto para debts (datos que cambian frecuentemente)

export async function GET(request: Request) {
  try {
    // ✅ Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("count") === "true";
    const now = Date.now();

    // ⚡ VERIFICAR CACHE PRIMERO
    if (debtsCache && now - debtsCache.timestamp < CACHE_DURATION) {
      if (countOnly) {
        return NextResponse.json({
          count: debtsCache.count,
          cached: true,
          timestamp: debtsCache.timestamp,
        });
      }
      return NextResponse.json({
        debts: debtsCache.data,
        count: debtsCache.count,
        cached: true,
        timestamp: debtsCache.timestamp,
      });
    }

    // ⚡ CONSULTA OPTIMIZADA - Solo campos necesarios
    const debtFields = {
      id: true,
      amount: true,
      concept: true,
      dueDate: true,
      isPaid: true,
      lastReminder: true,
      student: {
        select: {
          id: true,
          name: true,
          phone: true,
          user: { select: { email: true } }
        }
      }
    }

    if (countOnly) {
      // ⚡ Solo contar para requests de count
      const count = await prisma.debt.count({
        where: {
          isPaid: false,
          dueDate: {
            lt: new Date(),
          },
        },
      });

      // Actualizar cache con count
      if (debtsCache) {
        debtsCache.count = count;
        debtsCache.timestamp = now;
      } else {
        debtsCache = {
          data: [],
          count,
          timestamp: now,
        };
      }

      return NextResponse.json({ count });
    }

    // ⚡ CONSULTA COMPLETA OPTIMIZADA
    const debts = await prisma.debt.findMany({
      where: {
        isPaid: false,
        dueDate: {
          lt: new Date(),
        },
      },
      select: debtFields,
      orderBy: [{ dueDate: "asc" }, { amount: "desc" }],
      take: 100, // Limitar resultados para evitar sobrecarga
    });

    // ⚡ ACTUALIZAR CACHE
    debtsCache = {
      data: debts,
      count: debts.length,
      timestamp: now,
    };

    // ⚡ HEADERS DE CACHE PARA EL CLIENTE
    const response = NextResponse.json({
      debts,
      count: debts.length,
      total: debts.length,
      cached: false,
      timestamp: now,
    });

    response.headers.set(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );

    return response;
  } catch (error) {
    console.error("Error fetching debts:", error);

    // ⚡ FALLBACK CON CACHE EN CASO DE ERROR
    if (debtsCache) {
      return NextResponse.json({
        debts: debtsCache.data,
        count: debtsCache.count,
        cached: true,
        error: "Usando datos en cache debido a error temporal",
      });
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor",
        debts: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

// ⚡ INVALIDAR CACHE CUANDO SE CREAN/ACTUALIZAN DEBTS
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Invalidar cache
    debtsCache = null;

    const data = await request.json();

    // Validar que el studentId sea válido (ahora es string)
    const studentId = data.studentId?.toString().trim();
    if (!studentId || studentId.length === 0) {
      return NextResponse.json(
        {
          error: "ID de estudiante debe ser válido",
        },
        { status: 400 }
      );
    }

    const debt = await prisma.debt.create({
      data: {
        studentId: studentId,
        amount: Number.parseFloat(data.amount),
        concept: data.concept,
        dueDate: new Date(data.dueDate),
      },
    });

    // Actualizar estado de deuda del estudiante
    await prisma.student.update({
      where: { id: studentId },
      data: { hasDebt: true },
    });

    return NextResponse.json({ debt });
  } catch (error) {
    console.error("Error creando deuda:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
