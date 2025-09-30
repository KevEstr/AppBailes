import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClassSessionService } from '@/lib/class-session-service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/admin/generate-sessions - Generar sesiones manualmente
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN puede generar sesiones manualmente
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { classId, weeksToGenerate = 4 } = body;

    if (!classId) {
      return NextResponse.json({ error: "classId es requerido" }, { status: 400 });
    }

    // Verificar que la clase existe
    const danceClass = await prisma.danceClass.findUnique({
      where: { id: classId },
      include: {
        schedules: {
          where: { isActive: true }
        }
      }
    });

    if (!danceClass) {
      return NextResponse.json({ error: "Clase no encontrada" }, { status: 404 });
    }

    if (danceClass.schedules.length === 0) {
      return NextResponse.json({ error: "La clase no tiene horarios activos" }, { status: 400 });
    }

    // Generar sesiones
    const sessionService = new ClassSessionService(prisma);
    const result = await sessionService.generateSessionsForClass({
      classId: classId,
      schedules: danceClass.schedules,
      startDate: new Date(),
      weeksToGenerate: weeksToGenerate
    });

    return NextResponse.json({
      success: true,
      message: `Se generaron ${result.totalSessions} sesiones para la clase ${danceClass.name}`,
      sessionsGenerated: result.totalSessions,
      weeksGenerated: weeksToGenerate,
      className: danceClass.name
    });

  } catch (error) {
    console.error('Error generating sessions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/admin/generate-sessions - Obtener estadísticas de sesiones
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Solo ADMIN puede ver estadísticas
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const url = new URL(request.url);
    const classId = url.searchParams.get('classId');

    let whereClause: any = {};
    if (classId) {
      whereClause.classId = parseInt(classId);
    }

    // Obtener estadísticas de sesiones
    const totalSessions = await prisma.classSession.count({
      where: whereClause
    });

    const futureSessions = await prisma.classSession.count({
      where: {
        ...whereClause,
        date: {
          gte: new Date()
        }
      }
    });

    const pastSessions = await prisma.classSession.count({
      where: {
        ...whereClause,
        date: {
          lt: new Date()
        }
      }
    });

    // Obtener clases con sus estadísticas de sesiones
    const classesWithStats = await prisma.danceClass.findMany({
      where: {
        isActive: true,
      },
      include: {
        schedules: {
          where: { isActive: true }
        },
        _count: {
          select: {
            sessions: {
              where: {
                date: {
                  gte: new Date()
                }
              }
            }
          }
        }
      }
    });

    const classesStats = classesWithStats.map(cls => ({
      id: cls.id,
      name: cls.name,
      sport: cls.sport,
      schedulesCount: cls.schedules.length,
      futureSessionsCount: cls._count.sessions,
      weeksAhead: Math.ceil(cls._count.sessions / cls.schedules.length)
    }));

    return NextResponse.json({
      success: true,
      statistics: {
        totalSessions,
        futureSessions,
        pastSessions,
        classesCount: classesWithStats.length
      },
      classes: classesStats
    });

  } catch (error) {
    console.error('Error getting session statistics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
