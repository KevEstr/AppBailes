import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { classId, matchDate, notes, studentAttendances } = body;

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

    return NextResponse.json({
      success: true,
      match: {
        ...match,
        attendances: matchAttendances
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
