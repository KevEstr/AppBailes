import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { classId, matchDate, notes, studentAttendances } = body;

    console.log("📥 Recibiendo datos del evento:", {
      classId,
      matchDate,
      hasNotes: !!notes,
      hasStudentAttendances: !!studentAttendances,
      studentAttendancesCount: studentAttendances ? Object.keys(studentAttendances).length : 0,
      userId: session.user.id,
      userEmail: session.user.email,
    });

    // Validar datos requeridos
    if (!classId || !matchDate) {
      return NextResponse.json(
        { success: false, error: "Faltan datos requeridos" },
        { status: 400 }
      );
    }

    // Verificar que la clase existe
    const danceClass = await prisma.danceClass.findUnique({
      where: { id: parseInt(classId) },
      include: {
        enrollments: {
          where: { isActive: true },
          include: { student: true }
        },
        trainer: {
          include: {
            user: true
          }
        }
      }
    });

    if (!danceClass) {
      return NextResponse.json(
        { success: false, error: "Clase no encontrada" },
        { status: 404 }
      );
    }

    // Crear el partido
    const match = await prisma.match.create({
      data: {
        classId: parseInt(classId),
        matchDate: new Date(matchDate),
        notes: notes || null,
        status: "SCHEDULED"
      },
      include: {
        danceClass: {
          include: {
            trainer: true
          }
        }
      }
    });

    // Crear registros de asistencia con los estados proporcionados
    const matchAttendances = await Promise.all(
      danceClass.enrollments.map(enrollment => {
        const attendanceStatus = studentAttendances?.[enrollment.studentId];
        // Si no se proporciona un estado, usar ABSENT como fallback
        const finalStatus = attendanceStatus && attendanceStatus !== "" ? attendanceStatus : "ABSENT";
        return prisma.matchAttendance.create({
          data: {
            matchId: match.id,
            studentId: enrollment.studentId,
            status: finalStatus
          }
        });
      })
    );

    // Crear registro de asistencia del usuario que registra el evento
    // IMPORTANTE: Se asume automáticamente que el usuario que registra el evento está PRESENTE
    // El userId es el usuario que registra el evento (puede ser admin o trainer)
    // Esto permite que un profesor diferente registre el evento por reemplazo
    let trainerAttendanceRecord = null;
    
    try {
      const userId = parseInt(session.user.id);
      console.log("📝 Creando registro de asistencia del usuario que registra el evento:", {
        matchId: match.id,
        userId: userId,
        userEmail: session.user.email,
        userName: session.user.name,
        status: "PRESENT", // Siempre PRESENTE porque está registrando el evento
        matchDate: matchDate,
      });

      trainerAttendanceRecord = await (prisma as any).matchTrainerAttendance.create({
        data: {
          matchId: match.id,
          userId: userId, // Usuario que registra el evento (puede ser diferente al profesor de la clase)
          status: "PRESENT", // Siempre PRESENTE porque está registrando el evento
          date: new Date(matchDate),
          notes: notes || `Asistencia registrada para evento ${danceClass.name} - Registrado por: ${session.user.name || session.user.email}`
        }
      });

      console.log("✅ Registro de asistencia del usuario creado exitosamente:", trainerAttendanceRecord);
    } catch (error: any) {
      console.error("❌ Error al crear registro de asistencia del usuario:", error);
      // No fallar la creación del evento si falla el registro de asistencia
      // pero loguear el error para debugging
      console.error("Detalles del error:", {
        message: error.message,
        code: error.code,
        meta: error.meta
      });
    }

    return NextResponse.json({
      success: true,
      match: {
        ...match,
        attendances: matchAttendances,
        trainerAttendance: trainerAttendanceRecord
      }
    });

  } catch (error) {
    console.error("Error creating match:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const status = searchParams.get("status");

    const where: any = {};
    
    if (classId) {
      where.classId = parseInt(classId);
    }
    
    if (status) {
      where.status = status;
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        danceClass: {
          include: {
            trainer: true
          }
        },
        attendances: {
          include: {
            student: true
          }
        }
      },
      orderBy: {
        matchDate: "desc"
      }
    });

    return NextResponse.json({
      success: true,
      matches
    });

  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
