import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { periodId } = await request.json();

    if (!periodId) {
      return NextResponse.json(
        { message: 'Se requiere el ID del período' },
        { status: 400 }
      );
    }

    // Verificar que el período existe
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return NextResponse.json(
        { message: 'Período no encontrado' },
        { status: 404 }
      );
    }

    // Obtener la configuración de mensualidad actual
    const currentFee = await prisma.monthlyFeeConfig.findFirst({
      where: { isActive: true },
      orderBy: { validFrom: 'desc' }
    });

    if (!currentFee) {
      return NextResponse.json(
        { message: 'No hay configuración de mensualidad activa' },
        { status: 400 }
      );
    }

    // Obtener todos los estudiantes activos
    const activeStudents = await prisma.student.findMany({
      where: { isActive: true }
    });

    let generated = 0;
    let existing = 0;

    for (const student of activeStudents) {
      // Verificar si ya existe un pago mensual para este estudiante y período
      const existingPayment = await prisma.monthlyPayment.findUnique({
        where: {
          studentId_periodId: {
            studentId: student.id,
            periodId: periodId
          }
        }
      });

      if (existingPayment) {
        existing++;
        continue;
      }

      // Crear el pago mensual
      const monthlyPayment = await prisma.monthlyPayment.create({
        data: {
          studentId: student.id,
          periodId: periodId,
          feeConfigId: currentFee.id,
          expectedAmount: currentFee.amount,
          status: 'PENDING'
        }
      });

      // Crear el formulario de pago
      await prisma.paymentForm.create({
        data: {
          studentId: student.id,
          periodId: periodId,
          monthlyPaymentId: monthlyPayment.id,
          studentName: student.name,
          amount: currentFee.amount,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        }
      });

      generated++;
    }

    return NextResponse.json({
      success: true,
      generated,
      existing,
      message: `Se generaron ${generated} formularios. ${existing} ya existían.`
    });

  } catch (error) {
    console.error('Error generando formularios:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 