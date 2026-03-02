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
    const matchIdParam = searchParams.get("matchId") || "all";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    if (!userIdParam) {
      return NextResponse.json(
        { success: false, error: "Se requiere un ID de usuario" },
        { status: 400 }
      );
    }

    const userId = parseInt(userIdParam);

    // Calcular fechas
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateParam) {
      startDate = new Date(`${startDateParam}T00:00:00.000-05:00`);
    }
    if (endDateParam) {
      endDate = new Date(`${endDateParam}T23:59:59.999-05:00`);
    } else if (startDateParam) {
      // Si solo hay startDate, usar fecha actual como endDate
      endDate = new Date();
    }

    // Construir filtro
    const whereClause: any = {
      userId: userId,
    };

    if (startDate || endDate) {
      whereClause.match = {
        matchDate: {},
      };
      if (startDate) {
        whereClause.match.matchDate.gte = startDate;
      }
      if (endDate) {
        whereClause.match.matchDate.lte = endDate;
      }
    }

    if (matchIdParam !== "all") {
      const matchId = parseInt(matchIdParam);
      if (matchId) {
        whereClause.matchId = matchId;
      }
    }

    // Obtener asistencias de eventos
    // Nota: Esto requerirá que se regenere el cliente de Prisma después de la migración
    const attendances = await (prisma as any).matchTrainerAttendance.findMany({
      where: whereClause,
      include: {
        match: {
          include: {
            danceClass: {
              include: {
                trainer: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      attendances: attendances.map((att: any) => ({
        id: att.id,
        status: att.status,
        date: att.date,
        notes: att.notes,
        photoUrl: att.photoUrl,
        createdAt: att.createdAt,
        match: {
          id: att.match.id,
          matchDate: att.match.matchDate,
          notes: att.match.notes,
          status: att.match.status,
          danceClass: {
            id: att.match.danceClass.id,
            name: att.match.danceClass.name,
            sport: att.match.danceClass.sport,
            trainer: {
              id: att.match.danceClass.trainer.id,
              name: att.match.danceClass.trainer.name,
            },
          },
        },
      })),
      user: attendances.length > 0 ? {
        id: attendances[0].user.id,
        email: attendances[0].user.email,
        role: attendances[0].user.role,
      } : null,
    });
  } catch (error) {
    console.error("Error fetching match trainer attendance details:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

