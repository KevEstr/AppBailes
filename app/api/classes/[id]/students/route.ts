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
          },
        },
      },
      orderBy: {
        student: {
          name: "asc",
        },
      },
    });

    // Calcular hasDebt dinámicamente para todos los estudiantes
    const studentIds = enrollments.map(e => e.student.id);
    const today = new Date();
    const overduePaymentsCount = await prisma.monthlyPayment.groupBy({
      by: ['studentId'],
      where: {
        studentId: { in: studentIds },
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

    // Mapear estudiantes con hasDebt calculado dinámicamente
    const students = enrollments.map(enrollment => ({
      ...enrollment.student,
      hasDebt: (overduePaymentsMap.get(enrollment.student.id) || 0) > 0
    }));

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
