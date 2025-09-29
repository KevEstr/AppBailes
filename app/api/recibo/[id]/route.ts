import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toZonedTime } from 'date-fns-tz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receiptId = parseInt(id);
    
    if (isNaN(receiptId)) {
      return NextResponse.json(
        { error: 'ID de recibo inválido' },
        { status: 400 }
      );
    }

    // Buscar el recibo con información del estudiante
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        student: {
          include: {
            enrollmentData: true,
            classEnrollments: {
              include: {
                danceClass: {
                  select: { sport: true }
                }
              }
            }
          }
        }
      }
    });

    if (!receipt) {
      return NextResponse.json(
        { error: 'Recibo no encontrado' },
        { status: 404 }
      );
    }

    // Función para formatear fechas en zona horaria de Colombia
    const TZ = 'America/Bogota';
    const formatDate = (date: Date): string => {
      const zoned = toZonedTime(date, TZ);
      const day = zoned.getDate().toString().padStart(2, '0');
      const month = (zoned.getMonth() + 1).toString().padStart(2, '0');
      const year = zoned.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Determinar el deporte del estudiante
    const pickPrimarySport = (student: any): 'DANCE' | 'VOLLEYBALL' | null => {
      if (!student.classEnrollments || student.classEnrollments.length === 0) return null;
      const sports = [...new Set(student.classEnrollments.map((enrollment: any) => enrollment.danceClass.sport))];
      if (sports.length === 0) return null;
      return (sports.includes('DANCE') ? 'DANCE' : sports[0]) as any;
    };

    const sport = pickPrimarySport(receipt.student);

    // Calcular próximo pago (añadir 1 mes) en zona horaria de Colombia
    const createdAtZoned = toZonedTime(new Date(receipt.createdAt), TZ);
    const nextPaymentDate = new Date(createdAtZoned);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    // Determinar a nombre de quién va el recibo según mayoría de edad
    const isMinor = receipt.student.enrollmentData?.isAdult === false;
    const displayName = isMinor && receipt.student.enrollmentData?.emergencyContactName
      ? receipt.student.enrollmentData.emergencyContactName
      : receipt.student.name;

    // Formatear datos para el componente
    const receiptData = {
      id: receipt.id,
      receiptNumber: receipt.id.toString().padStart(4, '0'),
      studentName: displayName,
      amount: receipt.amount,
      concept: receipt.concept,
      paymentDate: formatDate(new Date(receipt.createdAt)),
      paymentMethod: receipt.paymentMethod,
      receivedBy: 'Sebastian Vasquez Correa',
      nextPaymentDate: formatDate(nextPaymentDate),
      sport: sport || 'DANCE' // Default a DANCE si no se puede determinar
    };

    return NextResponse.json({ receipt: receiptData });

  } catch (error) {
    console.error('Error obteniendo recibo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 