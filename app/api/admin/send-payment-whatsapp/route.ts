import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-service';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';
import { calculatePaymentPeriodForConcept } from '@/lib/period-calculator';
import { prisma } from '@/lib/prisma';

// POST /api/admin/send-payment-whatsapp - Enviar enlaces de pago por WhatsApp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { periodId, studentIds, sendToAll = false } = body;

    if (!periodId) {
      return NextResponse.json(
        { message: 'ID del período es obligatorio' },
        { status: 400 }
      );
    }

    // Obtener formularios de pago del período con información del deporte
    const paymentForms = await monthlyPaymentService.getPaymentFormsByPeriod(periodId);
    
    if (!paymentForms || paymentForms.length === 0) {
      return NextResponse.json(
        { message: 'No se encontraron formularios de pago para este período' },
        { status: 404 }
      );
    }

    // Filtrar por estudiantes específicos si se proporciona
    let formsToSend = paymentForms;
    if (!sendToAll && studentIds && studentIds.length > 0) {
      formsToSend = paymentForms.filter(form => studentIds.includes(form.studentId));
    }

    // Verificar que los estudiantes tengan teléfono del acudiente
    const formsWithPhone = formsToSend.filter((form: any) => 
      form.student.phone && form.student.phone.trim() !== ''
    );

    if (formsWithPhone.length === 0) {
      return NextResponse.json(
        { message: 'No se encontraron estudiantes con teléfono de acudiente configurado' },
        { status: 400 }
      );
    }

    // Enviar mensajes de WhatsApp
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    for (const form of formsWithPhone) {
      try {
        const paymentLink = `${baseUrl}/payment/${form.id}`;
        
        // Obtener el día de corte de la clase específica del formulario
        let cutoffDay = 30; // Default
        if (form.monthlyPayment?.classId) {
          const enrollment = await prisma.classEnrollment.findFirst({
            where: {
              studentId: form.studentId,
              classId: form.monthlyPayment.classId,
              isActive: true
            },
            select: { paymentCutoffDay: true }
          });
          cutoffDay = enrollment?.paymentCutoffDay || 30;
        }
        
        // Calcular el período correcto para el concepto basado en el día de corte
        const periodInfo = calculatePaymentPeriodForConcept(
          cutoffDay, 
          form.period.year, 
          form.period.month
        );
        
        console.log(`🔍 Debug para formulario ${form.id}:`);
        console.log(`   - StudentId: ${form.studentId}`);
        console.log(`   - ClassId: ${form.monthlyPayment?.classId}`);
        console.log(`   - CutoffDay calculado: ${cutoffDay}`);
        console.log(`   - PeriodInfo calculado:`, periodInfo);

        // Determinar el deporte del estudiante (priorizar DANCE sobre VOLLEYBALL)
        const sports = form.student.classEnrollments?.map((enrollment: any) => enrollment.danceClass.sport) || [];
        const primarySport = sports.includes('DANCE') ? 'DANCE' : (sports[0] || 'DANCE');

        const whatsappData = {
          studentName: form.student.name,
          parentPhone: form.student.phone,
          paymentLink: paymentLink,
          amount: form.amount,
          period: periodInfo.periodName,
          dueDate: periodInfo.dueDate,
          sport: primarySport,
          cutoffDay: cutoffDay
        };

        // Intentar enviar mensaje
        await whatsappService.sendPaymentMessage(whatsappData);
        
        // Marcar como enviado en la base de datos (opcional)
        // await monthlyPaymentService.markFormAsSent(form.id);
        
        results.sent++;
        
        // Delay entre mensajes para evitar spam
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Error enviando WhatsApp a ${form.student.name}:`, error);
        results.failed++;
        results.errors.push(`${form.student.name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    return NextResponse.json({
      message: `Proceso completado. ${results.sent} enviados, ${results.failed} fallidos`,
      results: {
        sent: results.sent,
        failed: results.failed,
        total: formsWithPhone.length,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('Error en envío masivo de WhatsApp:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/send-payment-whatsapp/single - Enviar mensaje individual
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId } = body;

    if (!formId) {
      return NextResponse.json(
        { message: 'ID del formulario es obligatorio' },
        { status: 400 }
      );
    }

    // Obtener datos del formulario
    const form: any = await monthlyPaymentService.getPaymentForm(formId);
    
    if (!form.student.phone) {
      return NextResponse.json(
        { message: 'El estudiante no tiene teléfono configurado' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentLink = `${baseUrl}/payment/${form.id}`;
    const dueDate = new Date(form.period.dueDate).toLocaleDateString('es-ES');

    // Determinar el deporte del estudiante (priorizar DANCE sobre VOLLEYBALL)
    const sports = form.student.classEnrollments?.map((enrollment: any) => enrollment.danceClass.sport) || [];
    const primarySport = sports.includes('DANCE') ? 'DANCE' : (sports[0] || 'DANCE');

    const whatsappData = {
      studentName: form.student.name,
      parentPhone: form.student.phone,
      paymentLink: paymentLink,
      amount: form.amount,
      period: form.period.name,
      dueDate: dueDate,
      sport: primarySport
    };

    // Enviar mensaje
    const result = await whatsappService.sendPaymentMessage(whatsappData);

    return NextResponse.json({
      message: 'Mensaje de WhatsApp enviado exitosamente',
      whatsappResponse: result
    });

  } catch (error) {
    console.error('Error enviando WhatsApp individual:', error);
    
    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { message: 'WhatsApp no está configurado correctamente' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 