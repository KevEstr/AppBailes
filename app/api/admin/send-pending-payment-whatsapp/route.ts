import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { whatsappService, WhatsAppService } from '@/lib/whatsapp-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

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
        period: true
      }
    });

    // Filtrar solo estudiantes con teléfono
    const paymentsWithPhone = payments.filter(payment =>
      payment.student.isActive && 
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
        const dueDate = new Date(payment.period.dueDate).toLocaleDateString('es-ES');
        
        // Determinar el deporte del estudiante
        const sports = payment.student.classEnrollments?.map(enrollment => enrollment.danceClass.sport) || [];
        const primarySport = sports.includes('DANCE') ? 'DANCE' : (sports[0] || 'DANCE');
        
        const whatsappData = {
          studentName: payment.student.name,
          parentPhone: payment.student.phone,
          amount: payment.expectedAmount,
          period: payment.period.name,
          dueDate: dueDate,
          sport: primarySport,
          paymentId: payment.id,
          paymentLink: '' // No usamos links de pago en el nuevo sistema
        };

        console.log('📤 Enviando WhatsApp a:', payment.student.name, 'Teléfono original:', payment.student.phone);
        
        // Formatear el teléfono antes de enviarlo
        const formattedPhone = WhatsAppService.formatPhoneNumber(payment.student.phone);
        console.log('📱 Teléfono formateado:', formattedPhone);
        
        const result = await whatsappService.sendCustomPaymentTemplate(whatsappData, formattedPhone);
        console.log('📨 Resultado WhatsApp para', payment.student.name, ':', result);
        sentCount++;

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
