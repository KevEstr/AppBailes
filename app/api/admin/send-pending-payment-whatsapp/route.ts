import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';
import { calculatePaymentPeriodForConcept } from '@/lib/period-calculator';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { periodId, studentIds } = await request.json();

    if (!periodId) {
      return NextResponse.json(
        { message: 'ID de período es requerido' },
        { status: 400 }
      );
    }

    // Obtener pagos pendientes
    const whereClause: any = {
      periodId: parseInt(periodId),
      status: { in: ['PENDING', 'OVERDUE'] }
    };

    // Filtrar por estudiantes específicos si se proporcionan
    if (studentIds && studentIds.length > 0) {
      whereClause.studentId = { in: studentIds };
    }

    const payments = await prisma.monthlyPayment.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            enrollmentData: true,
            classEnrollments: {
              where: { isActive: true },
              include: {
                danceClass: {
                  select: { sport: true }
                }
              }
            }
          }
        },
        period: true,
        danceClass: {
          select: { id: true, name: true, sport: true }
        }
      }
    });

    console.log('📋 Pagos encontrados:', payments);

    // Filtrar solo estudiantes con teléfono
    const paymentsWithPhone = payments.filter(payment =>
      payment.student.phone && 
      payment.student.phone.trim() !== ''
    );

    if (paymentsWithPhone.length === 0) {
      return NextResponse.json(
        { message: 'No hay estudiantes con teléfono configurado para enviar mensajes' },
        { status: 400 }
      );
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Verificar conexión con WhatsApp antes de enviar
    console.log('🔍 Verificando conexión con WhatsApp...');
    const isConnected = await whatsappService.verifyConnection();
    console.log('📡 Conexión WhatsApp:', isConnected ? '✅ Conectado' : '❌ Falló');
    
    if (!isConnected) {
      return NextResponse.json(
        { message: 'Error de conexión con WhatsApp API' },
        { status: 500 }
      );
    }

    // Enviar mensajes
    for (let i = 0; i < paymentsWithPhone.length; i++) {
      const payment = paymentsWithPhone[i];
      
      try {
        // Obtener el día de corte de la clase específica
        let enrollment = null;
        if (payment.classId !== null) {
          enrollment = await prisma.classEnrollment.findFirst({
            where: {
              studentId: payment.studentId,
              classId: payment.classId as number,
              isActive: true
            }
          });
        }

        const cutoffDay = enrollment?.paymentCutoffDay || 30;
        
        console.log(`🔍 Debug para pago ${payment.id}:`);
        console.log(`   - StudentId: ${payment.studentId}`);
        console.log(`   - ClassId: ${payment.classId}`);
        console.log(`   - Enrollment encontrado:`, enrollment);
        console.log(`   - CutoffDay calculado: ${cutoffDay}`);
        
        // Calcular el período correcto para el concepto basado en el día de corte
        const periodInfo = calculatePaymentPeriodForConcept(
          cutoffDay, 
          payment.period.year, 
          payment.period.month
        );
        
        console.log(`   - PeriodInfo calculado:`, periodInfo);
        
        const whatsappData = {
          studentName: payment.student.name,
          parentPhone: payment.student.phone,
          amount: payment.expectedAmount,
          period: periodInfo.periodName,
          dueDate: periodInfo.dueDate,
          sport: payment.danceClass?.sport || 'DANCE',
          paymentId: payment.id,
          cutoffDay: cutoffDay, // Agregar el día de corte para el template
          paymentLink: '' // No usamos links de pago en el nuevo sistema
        };

        console.log('📤 Enviando WhatsApp a:', payment.student.name, 'Teléfono original:', payment.student.phone);
        
        // Formatear el teléfono antes de enviarlo
        const formattedPhone = whatsappService.formatPhoneNumber(payment.student.phone);
        console.log('📱 Teléfono formateado:', formattedPhone);
        
        const result = await whatsappService.sendCustomPaymentTemplate(whatsappData, formattedPhone);
        console.log('📨 Resultado WhatsApp para', payment.student.name, ':', result);
        
        // Verificar que el mensaje se haya enviado correctamente
        // Solo marcar como enviado si la respuesta es exitosa (status 200 y sin errores)
        const hasError = (result as any)?.error;
        const hasMessageId = (result as any)?.messages?.[0]?.id;
        
        if (result && !hasError && hasMessageId) {
          // Marcar como enviado el recordatorio solo si fue exitoso
          await prisma.monthlyPayment.update({
            where: { id: payment.id },
            data: {
              reminderSent: true,
              reminderSentAt: new Date()
            } as any // Temporal hasta que se regenere Prisma
          });
          sentCount++;
        } else {
          // Si no hay ID de mensaje o hay error, considerar como fallido
          const errorCode = (result as any)?.error?.code;
          const errorMsg = errorCode 
            ? `Error ${errorCode} de WhatsApp API`
            : 'No se recibió confirmación de envío del mensaje';
          throw new Error(errorMsg);
        }

        // Intervalo entre mensajes
        if (i < paymentsWithPhone.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (messageError) {
        const errorMsg = `Error enviando a ${payment.student.name}: ${messageError instanceof Error ? messageError.message : 'Error desconocido'}`;
        errors.push(errorMsg);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Mensajes enviados: ${sentCount}, Fallidos: ${failedCount}`,
      sentCount,
      failedCount,
      totalProcessed: paymentsWithPhone.length,
      errors: errors.slice(0, 5) // Solo primeros 5 errores
    });

  } catch (error) {
    console.error('Error enviando mensajes de WhatsApp:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
