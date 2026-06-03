import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { resolveCutoffDay } from '@/lib/payment-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');
    const cutoffDay = searchParams.get('cutoffDay'); // '15' o '30'

    if (!periodId) {
      return NextResponse.json(
        { message: 'ID de período es requerido' },
        { status: 400 }
      );
    }

    if (!cutoffDay || (cutoffDay !== '15' && cutoffDay !== '30')) {
      return NextResponse.json(
        { message: 'Día de corte debe ser 15 o 30' },
        { status: 400 }
      );
    }

    const targetCutoffDay = parseInt(cutoffDay);

    // Obtener todos los pagos pendientes del período que NO hayan recibido recordatorio
    const payments = await prisma.monthlyPayment.findMany({
      where: {
        periodId: parseInt(periodId),
        status: { in: ['PENDING', 'OVERDUE'] },
        reminderSent: false // Solo pagos que NO han recibido recordatorio
      },
      include: {
        student: {
          include: {
            classEnrollments: {
              where: { isActive: true },
              include: {
                danceClass: {
                  select: { id: true, name: true, sport: true }
                }
              }
            }
          }
        },
        danceClass: {
          select: { id: true, name: true, sport: true }
        }
      }
    });

    // Filtrar pagos por día de corte
    const filteredPayments = [];
    for (const payment of payments) {
      const paymentCutoffDay = await resolveCutoffDay(payment.studentId, payment.classId);

      if (paymentCutoffDay === targetCutoffDay) {
        filteredPayments.push({
          id: payment.id,
          student: {
            id: payment.student.id,
            name: payment.student.name,
            phone: payment.student.phone
          },
          class: payment.danceClass ? {
            id: payment.danceClass.id,
            name: payment.danceClass.name,
            sport: payment.danceClass.sport
          } : null,
          expectedAmount: payment.expectedAmount,
          status: payment.status,
          reminderSent: payment.reminderSent,
          reminderSentAt: payment.reminderSentAt
        });
      }
    }

    // Filtrar solo estudiantes con teléfono
    const paymentsWithPhone = filteredPayments.filter(p => 
      p.student.phone && p.student.phone.trim() !== ''
    );

    return NextResponse.json({
      success: true,
      payments: paymentsWithPhone,
      total: paymentsWithPhone.length
    });

  } catch (error) {
    console.error('Error obteniendo pagos por día de corte:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

