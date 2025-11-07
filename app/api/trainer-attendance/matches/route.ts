import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    const pageParam = parseInt(searchParams.get("page") || "1");
    const limitParam = parseInt(searchParams.get("limit") || "25");
    const search = (searchParams.get("search") || "").trim();
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Calcular fechas
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(`${startDateParam}T00:00:00.000-05:00`);
    }
    if (endDateParam) {
      endDate = new Date(`${endDateParam}T23:59:59.999-05:00`);
    }

    // Construir filtro base
    const whereClause: any = {};

    // Filtro por usuario (trainer)
    if (userIdParam) {
      const userId = parseInt(userIdParam);
      if (userId) {
        whereClause.userId = userId;
      }
    }

    // Filtro por rango de fechas
    if (startDate || endDate) {
      whereClause.match = {
        matchDate: {}
      };
      if (startDate) {
        whereClause.match.matchDate.gte = startDate;
      }
      if (endDate) {
        whereClause.match.matchDate.lte = endDate;
      }
    }

    // Filtro de búsqueda
    if (search) {
      whereClause.OR = [
        {
          match: {
            danceClass: {
              name: { contains: search, mode: 'insensitive' }
            }
          }
        },
        {
          notes: { contains: search, mode: 'insensitive' }
        }
      ];
    }

    // Paginación
    const skip = (Math.max(pageParam, 1) - 1) * Math.max(limitParam, 1);
    const take = Math.max(limitParam, 1);

    // Obtener asistencias de eventos
    // Usar cast a any temporalmente hasta que Prisma genere los tipos correctamente
    const [attendances, total] = await Promise.all([
      (prisma as any).matchTrainerAttendance.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true
            }
          },
          match: {
            include: {
              danceClass: {
                include: {
                  trainer: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          date: 'desc'
        },
        skip,
        take
      }),
      (prisma as any).matchTrainerAttendance.count({ where: whereClause })
    ]);

    const totalPages = Math.ceil(total / take);

    return NextResponse.json({
      success: true,
      attendances: attendances.map((att: any) => ({
        id: att.id,
        status: att.status,
        date: att.date,
        notes: att.notes,
        createdAt: att.createdAt,
        user: {
          id: att.user.id,
          email: att.user.email,
          role: att.user.role
        },
        match: {
          id: att.match.id,
          matchDate: att.match.matchDate,
          notes: att.match.notes,
          status: att.match.status,
          danceClass: {
            id: att.match.danceClass.id,
            name: att.match.danceClass.name,
            trainer: {
              id: att.match.danceClass.trainer.id,
              name: att.match.danceClass.trainer.name
            }
          }
        }
      })),
      pagination: {
        page: Math.max(pageParam, 1),
        limit: take,
        total,
        totalPages,
        hasNext: Math.max(pageParam, 1) < totalPages,
        hasPrev: Math.max(pageParam, 1) > 1
      }
    });
  } catch (error) {
    console.error("Error fetching match trainer attendances:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

