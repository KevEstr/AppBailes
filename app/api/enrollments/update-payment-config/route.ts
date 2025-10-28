import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: NextRequest) {
  try {
    const { enrollmentId, paymentCutoffDay, monthlyFee } = await request.json();

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'ID de inscripción es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la inscripción existe
    const enrollment = await prisma.classEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        danceClass: true
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Inscripción no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la configuración de pagos de la clase
    const updatedEnrollment = await prisma.classEnrollment.update({
      where: { id: enrollmentId },
      data: {
        paymentCutoffDay: paymentCutoffDay || 30,
        monthlyFee: monthlyFee || null
      },
      include: {
        student: true,
        danceClass: true
      }
    });

    console.log(`✅ Updated payment config for enrollment ${enrollmentId}:`, {
      paymentCutoffDay: updatedEnrollment.paymentCutoffDay,
      monthlyFee: updatedEnrollment.monthlyFee
    });

    return NextResponse.json({
      success: true,
      enrollment: updatedEnrollment
    });

  } catch (error) {
    console.error('❌ Error updating enrollment payment config:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
