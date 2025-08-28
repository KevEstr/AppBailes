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

    // Crear el registro de asistencia del trainer
    const trainerAttendance = await prisma.trainerAttendance.create({
      data: {
        userId: parseInt(session.user.id), // Usar el ID del usuario que toma la asistencia
        classId: parseInt(classId),
        status,
        notes: notes || `Asistencia registrada para clase ${danceClass.name} - Registrado por: ${session.user.name || session.user.email}`,
        date: new Date(),
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

    // Si se especifica una fecha, filtrar por esa fecha
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      whereClause.date = {
        gte: startDate,
        lte: endDate,
      };
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
