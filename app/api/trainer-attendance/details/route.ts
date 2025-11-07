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
    const classIdParam = searchParams.get("classId") || "all";
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
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = startDate;
      }
      if (endDate) {
        whereClause.date.lte = endDate;
      }
    }

    if (classIdParam !== "all") {
      const classId = parseInt(classIdParam);
      if (classId) {
        whereClause.classId = classId;
      }
    }

    // Obtener asistencias
    const attendances = await prisma.trainerAttendance.findMany({
      where: whereClause,
      include: {
        class: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
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
        createdAt: att.createdAt,
        class: {
          id: att.class.id,
          name: att.class.name,
          sport: att.class.sport,
          trainer: {
            id: att.class.trainer.id,
            name: att.class.trainer.name,
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
    console.error("Error fetching trainer attendance details:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

