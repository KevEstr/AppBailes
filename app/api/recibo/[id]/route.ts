import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toZonedTime } from 'date-fns-tz';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receiptId = Number.parseInt(id);
    
    if (Number.isNaN(receiptId)) {
      return NextResponse.json(
        { error: 'ID de recibo inválido' },
        { status: 400 }
      );
    }

    // Buscar el recibo con información del estudiante y el pago mensual
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
        },
        monthlyPayment: {
          include: {
            danceClass: {
              select: { sport: true }
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

    // Determinar el deporte del recibo:
    // 1. Si el recibo está asociado a un pago mensual con clase específica, usar el deporte de esa clase
    // 2. Si no, usar el deporte principal del estudiante (prioriza DANCE)
    const pickPrimarySport = (student: any): 'DANCE' | 'VOLLEYBALL' | null => {
      if (!student.classEnrollments || student.classEnrollments.length === 0) return null;
      const sports = [...new Set(student.classEnrollments.map((enrollment: any) => enrollment.danceClass.sport))];
      if (sports.length === 0) return null;
      return (sports.includes('DANCE') ? 'DANCE' : sports[0]) as any;
    };

    let sport: 'DANCE' | 'VOLLEYBALL' | null = null;
    if (receipt.monthlyPayment?.classId && receipt.monthlyPayment?.danceClass) {
      // Usar el deporte de la clase específica del pago mensual
      sport = receipt.monthlyPayment.danceClass.sport as 'DANCE' | 'VOLLEYBALL';
      console.log(`📋 Recibo ${receiptId}: Usando deporte de la clase específica del pago: ${sport} (ClassId: ${receipt.monthlyPayment.classId})`);
    } else {
      // Fallback: usar el deporte principal del estudiante
      sport = pickPrimarySport(receipt.student);
      console.log(`📋 Recibo ${receiptId}: Usando deporte principal del estudiante (fallback): ${sport}`);
    }

    // Obtener el día de corte de la clase específica
    let cutoff = 30; // Default
    if (receipt.monthlyPayment?.classId) {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: {
          studentId: receipt.studentId,
          classId: receipt.monthlyPayment.classId,
          isActive: true
        },
        select: { paymentCutoffDay: true }
      });
      cutoff = enrollment?.paymentCutoffDay || 30;
    }
    
    console.log(`🔍 Debug para recibo ${receiptId}:`);
    console.log(`   - StudentId: ${receipt.studentId}`);
    console.log(`   - ClassId: ${receipt.monthlyPayment?.classId}`);
    console.log(`   - Deporte del recibo: ${sport || 'No determinado'}`);
    console.log(`   - CutoffDay calculado: ${cutoff}`);
    
    // Calcular próximo pago basado en el período del pago mensual
    let nextPaymentDate: Date;
    
    if (receipt.monthlyPayment) {
      // Si es un pago mensual, obtener el período y calcular el siguiente
      const monthlyPayment = await prisma.monthlyPayment.findUnique({
        where: {
          id: receipt.monthlyPaymentId as number
        },
        include: { period: true }
      });

      console.log(`   - Monthly payment: ${JSON.stringify(monthlyPayment)}`);
      if (monthlyPayment?.period) {
        // Calcular el mes siguiente al período del pago usando componentes (sin conversiones de zona horaria)
        const curYear = monthlyPayment.period.year;
        const curMonth = monthlyPayment.period.month; // 1-12
        const nextMonthNum = curMonth === 12 ? 1 : curMonth + 1;
        const nextYear = curMonth === 12 ? curYear + 1 : curYear;
        // Construir directamente con año/mes/día
        nextPaymentDate = new Date(nextYear, nextMonthNum - 1, cutoff);

        console.log(`   - Period year: ${curYear}`);
        console.log(`   - Period month: ${curMonth}`);
        console.log(`   - Next year: ${nextYear}`);
        console.log(`   - Next month: ${nextMonthNum}`);
      } else {
        // Fallback: usar fecha de creación del recibo + 1 mes (sin conversiones)
        const created = new Date(receipt.createdAt);
        const curYear = created.getFullYear();
        const curMonth = created.getMonth() + 1; // 1-12
        const nextMonthNum = curMonth === 12 ? 1 : curMonth + 1;
        const nextYear = curMonth === 12 ? curYear + 1 : curYear;
        nextPaymentDate = new Date(nextYear, nextMonthNum - 1, cutoff);
      }
    } else {
      // Si no es un pago mensual, usar fecha de creación del recibo + 1 mes
      const paymentDate = toZonedTime(new Date(receipt.createdAt), TZ);
      nextPaymentDate = new Date(paymentDate);
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      nextPaymentDate.setDate(cutoff);
    }
    
    console.log(`   - Next payment date: ${nextPaymentDate.toISOString()}`);
    console.log(`   - Next payment date formatted: ${formatDate(nextPaymentDate)}`);

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