import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { classId, status = "PRESENT", notes } = body;

    if (!classId) {
      return NextResponse.json(
        { success: false, error: "ID de la clase es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la clase existe
    const danceClass = await prisma.danceClass.findUnique({
      where: { id: parseInt(classId) },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!danceClass) {
      return NextResponse.json(
        { success: false, error: "Clase no encontrada" },
        { status: 404 }
      );
    }

    // Debug: Log de información de sesión
    console.log("Debug - Session user:", {
      role: session.user.role,
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email
    });
    console.log("Debug - Request classId:", classId, "Class trainer:", danceClass.trainer.name);

    // Verificar permisos: solo ADMIN y TEACHER pueden registrar asistencia
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      console.log("Debug - Permission denied: invalid role", { role: session.user.role });
      return NextResponse.json(
        { success: false, error: "No tienes permisos para registrar asistencia" },
        { status: 403 }
      );
    }

    const userId = parseInt(session.user.id);
    const parsedClassId = parseInt(classId);
    const now = new Date();
    
    // Calcular el inicio y fin del día actual (solo fecha, sin hora)
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // Verificar si ya existe un registro para este usuario, clase y fecha (solo día)
    const existingAttendance = await prisma.trainerAttendance.findFirst({
      where: {
        userId: userId,
        classId: parsedClassId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    let trainerAttendance;
    const attendanceNotes = notes || `Asistencia registrada para clase ${danceClass.name} - Registrado por: ${session.user.name || session.user.email}`;

    if (existingAttendance) {
      // Si ya existe, actualizar el registro existente
      console.log("📝 Actualizando registro existente de asistencia:", {
        id: existingAttendance.id,
        userId: userId,
        classId: parsedClassId,
        date: now.toISOString(),
      });

      trainerAttendance = await prisma.trainerAttendance.update({
        where: { id: existingAttendance.id },
        data: {
          status,
          notes: attendanceNotes,
          date: now, // Actualizar la fecha/hora al momento actual
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              trainer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    } else {
      // Si no existe, crear un nuevo registro
      console.log("📝 Creando nuevo registro de asistencia:", {
        userId: userId,
        classId: parsedClassId,
        date: now.toISOString(),
      });

      trainerAttendance = await prisma.trainerAttendance.create({
        data: {
          userId: userId,
          classId: parsedClassId,
          status,
          notes: attendanceNotes,
          date: now,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              trainer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      trainerAttendance,
      message: "Asistencia registrada exitosamente",
    });

  } catch (error) {
    console.error("Error registrando asistencia:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

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
    const userId = searchParams.get("userId");
    const classId = searchParams.get("classId");
    const date = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const skip = (page - 1) * limit;

    let whereClause: any = {};

    // Si se especifica un userId, filtrar por ese usuario
    if (userId) {
      whereClause.userId = parseInt(userId);
    }

    // Si se especifica un classId, filtrar por esa clase
    if (classId) {
      whereClause.classId = parseInt(classId);
    }

    // Filtro por rango de fechas (preferente si viene startDate/endDate)
    if (startDateParam || endDateParam) {
      whereClause.date = {}
      if (startDateParam) {
        whereClause.date.gte = new Date(startDateParam + 'T00:00:00-05:00')
      }
      if (endDateParam) {
        whereClause.date.lte = new Date(endDateParam + 'T23:59:59-05:00')
      }
    } else if (date) {
      // Compatibilidad con un solo día
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      whereClause.date = { gte: startDate, lte: endDate }
    }

    // Búsqueda por texto
    if (search) {
      whereClause.OR = [
        {
          user: {
            email: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          class: {
            name: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          notes: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Obtener total de registros para paginación
    const total = await prisma.trainerAttendance.count({
      where: whereClause,
    });

    const attendances = await prisma.trainerAttendance.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
        class: {
          select: {
            id: true,
            name: true,
            trainer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      skip,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      attendances,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Error obteniendo asistencias:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
