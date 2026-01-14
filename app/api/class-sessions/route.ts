import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const prisma = new PrismaClient();

const createSessionSchema = z.object({
  classId: z.number().int().positive("ID de clase debe ser un número positivo"),
  date: z.string().min(1, "Fecha requerida"),
  startTime: z.string().min(1, "Hora de inicio requerida"),
  endTime: z.string().min(1, "Hora de fin requerida"),
  notes: z.string().optional(),
});

const updateSessionSchema = z.object({
  status: z
    .enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .optional(),
  notes: z.string().optional(),
});

// GET - Obtener sesiones
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const classIdParam = url.searchParams.get("classId");
    const date = url.searchParams.get("date");
    const status = url.searchParams.get("status");
    const upcoming = url.searchParams.get("upcoming") === "true";

    let where: any = {};

    if (classIdParam) {
      const classId = parseInt(classIdParam);
      if (classId) {
        where.classId = classId;
      }
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);
      
      // Para clases que cruzan medianoche, también incluir sesiones que empiezan el día anterior
      const previousDay = new Date(startOfDay);
      previousDay.setDate(previousDay.getDate() - 1);
      
      where.OR = [
        {
          // Sesiones que empiezan hoy
          startTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        {
          // Sesiones que empezaron ayer pero terminan hoy
          AND: [
            {
              startTime: {
                gte: new Date(previousDay.setHours(0, 0, 0, 0)),
                lte: new Date(previousDay.setHours(23, 59, 59, 999)),
              },
            },
            {
              endTime: {
                gte: startOfDay,
              },
            },
          ],
        },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (upcoming) {
      where.date = {
        gte: new Date(),
      };
    }

    console.log('🔍 Buscando sesiones con criterios:', JSON.stringify(where, null, 2));

    const sessions = await prisma.classSession.findMany({
      where,
      include: {
        danceClass: {
          include: {
            trainer: {
              select: {
                id: true,
                name: true,
              },
            },
            schedules: {
              where: { isActive: true },
            },
            enrollments: {
              where: { isActive: true },
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    hasDebt: true,
                  },
                },
              },
            },
          },
        },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendances: true,
          },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    console.log(`✅ Encontradas ${sessions.length} sesiones`);
    
    // Calcular hasDebt dinámicamente para todos los estudiantes en las sesiones
    // Obtener todos los IDs de estudiantes únicos
    const allStudentIds = new Set<string>();
    sessions.forEach(session => {
      session.danceClass.enrollments.forEach(enrollment => {
        allStudentIds.add(enrollment.student.id);
      });
    });
    
    // Consultar pagos vencidos para todos los estudiantes
    const today = new Date();
    const studentIdsArray = Array.from(allStudentIds);
    const overduePaymentsCount = await prisma.monthlyPayment.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIdsArray },
        status: { in: ['PENDING', 'OVERDUE'] },
        dueDate: {
          lt: today, // Pagos vencidos (dueDate < hoy)
          not: null
        }
      },
      _count: true
    });
    
    // Crear mapa para acceso rápido
    const overduePaymentsMap = new Map(overduePaymentsCount.map(p => [p.studentId, p._count]));
    
    // Actualizar hasDebt en cada enrollment
    const sessionsWithDebt = sessions.map(session => ({
      ...session,
      danceClass: {
        ...session.danceClass,
        enrollments: session.danceClass.enrollments.map(enrollment => ({
          ...enrollment,
          student: {
            ...enrollment.student,
            hasDebt: (overduePaymentsMap.get(enrollment.student.id) || 0) > 0
          }
        }))
      }
    }));
    
    sessions.forEach((session, index) => {
      console.log(`📝 Sesión ${index + 1}:`, {
        id: session.id,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        enrollments: session.danceClass.enrollments.length,
        attendances: session._count.attendances,
      });
    });

    return NextResponse.json({ success: true, sessions: sessionsWithDebt });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Crear nueva sesión
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN y TEACHER pueden crear sesiones
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = createSessionSchema.parse(body);

    // Verificar que la clase existe
    const danceClass = await prisma.danceClass.findUnique({
      where: { id: validatedData.classId },
    });

    if (!danceClass) {
      return NextResponse.json(
        { error: "Clase no encontrada" },
        { status: 404 }
      );
    }

    // Crear las fechas completas
    const sessionDate = new Date(validatedData.date);
    const [startHour, startMinute] = validatedData.startTime.split(":");
    const [endHour, endMinute] = validatedData.endTime.split(":");

    const startDateTime = new Date(sessionDate);
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);

    const endDateTime = new Date(sessionDate);
    endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);

    const newSession = await prisma.classSession.create({
      data: {
        classId: validatedData.classId,
        date: sessionDate,
        startTime: startDateTime,
        endTime: endDateTime,
        notes: validatedData.notes,
      },
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
    });

    return NextResponse.json({ success: true, session: newSession });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// PUT - Actualizar sesión
export async function PUT(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN y TEACHER pueden actualizar sesiones
    if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const url = new URL(request.url);
    const sessionIdParam = url.searchParams.get("id");

    if (!sessionIdParam) {
      return NextResponse.json(
        { error: "ID de sesión requerido" },
        { status: 400 }
      );
    }

    const sessionId = parseInt(sessionIdParam);
    if (!sessionId || sessionId <= 0) {
      return NextResponse.json(
        {
          error: "ID de sesión debe ser un número válido",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = updateSessionSchema.parse(body);

    const updatedSession = await prisma.classSession.update({
      where: { id: sessionId },
      data: validatedData,
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
    });

    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar sesión
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN puede eliminar sesiones
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Solo administradores pueden eliminar sesiones" },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const sessionIdParam = url.searchParams.get("id");

    if (!sessionIdParam) {
      return NextResponse.json(
        { error: "ID de sesión requerido" },
        { status: 400 }
      );
    }

    const sessionId = parseInt(sessionIdParam);
    if (!sessionId || sessionId <= 0) {
      return NextResponse.json(
        {
          error: "ID de sesión debe ser un número válido",
        },
        { status: 400 }
      );
    }

    // Verificar si la sesión tiene asistencias
    const attendanceCount = await prisma.attendance.count({
      where: { sessionId: sessionId },
    });

    if (attendanceCount > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar la sesión porque tiene ${attendanceCount} asistencia(s) registrada(s)`,
        },
        { status: 400 }
      );
    }

    await prisma.classSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({
      success: true,
      message: "Sesión eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
