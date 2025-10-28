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
          select: { classId: true }
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
    console.log(`   - CutoffDay calculado: ${cutoff}`);
    
    // Calcular próximo pago basado en el período del pago mensual
    let nextPaymentDate: Date;
    
    if (receipt.monthlyPayment) {
      // Si es un pago mensual, obtener el período y calcular el siguiente
      const monthlyPayment = await prisma.monthlyPayment.findFirst({
        where: { 
          studentId: receipt.studentId,
          classId: receipt.monthlyPayment.classId
        },
        include: { period: true },
        orderBy: { createdAt: 'desc' }
      });
      
      if (monthlyPayment?.period) {
        // Calcular el mes siguiente al período del pago
        const currentPeriodDate = new Date(monthlyPayment.period.year, monthlyPayment.period.month - 1, 1);
        const nextPeriodDate = new Date(currentPeriodDate);
        nextPeriodDate.setMonth(nextPeriodDate.getMonth() + 1);
        nextPaymentDate = new Date(nextPeriodDate.getFullYear(), nextPeriodDate.getMonth(), cutoff);
        
        console.log(`   - Period year: ${monthlyPayment.period.year}`);
        console.log(`   - Period month: ${monthlyPayment.period.month}`);
        console.log(`   - Current period date: ${currentPeriodDate.toISOString()}`);
        console.log(`   - Next period date: ${nextPeriodDate.toISOString()}`);
      } else {
        // Fallback: usar fecha de creación del recibo + 1 mes
        const paymentDate = toZonedTime(new Date(receipt.createdAt), TZ);
        nextPaymentDate = new Date(paymentDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        nextPaymentDate.setDate(cutoff);
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