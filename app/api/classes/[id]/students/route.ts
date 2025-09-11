import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const classId = parseInt(id);

    if (isNaN(classId)) {
      return NextResponse.json(
        { success: false, error: "ID de clase inválido" },
        { status: 400 }
      );
    }

    // Obtener estudiantes inscritos en la clase
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        classId: classId,
        isActive: true,
      },
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
      orderBy: {
        student: {
          name: "asc",
        },
      },
    });

    const students = enrollments.map(enrollment => enrollment.student);

    return NextResponse.json({
      success: true,
      students,
    });

  } catch (error) {
    console.error("Error fetching class students:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
