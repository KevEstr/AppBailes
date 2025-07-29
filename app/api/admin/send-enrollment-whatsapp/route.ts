import { NextRequest, NextResponse } from 'next/server';
import { enrollmentPaymentService } from '@/lib/enrollment-payment-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/admin/send-enrollment-whatsapp - Enviar WhatsApp de inscripción
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studentId } = body;

    if (!studentId) {
      return NextResponse.json(
        { message: 'ID del estudiante es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el estudiante tiene un pago de inscripción
    const enrollmentPayment = await enrollmentPaymentService.getStudentEnrollmentPaymentInfo(studentId);

    if (!enrollmentPayment) {
      return NextResponse.json(
        { message: 'El estudiante no tiene un pago de inscripción registrado' },
        { status: 404 }
      );
    }

    // Generar formulario de pago si no existe
    if (!enrollmentPayment.hasActiveForm) {
      await enrollmentPaymentService.generateEnrollmentPaymentForm(studentId);
    }

    // Enviar WhatsApp
    const result = await enrollmentPaymentService.sendEnrollmentPaymentWhatsApp(studentId);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp de inscripción enviado exitosamente',
      result
    });

  } catch (error) {
    console.error('Error enviando WhatsApp de inscripción:', error);
    
    if (error instanceof Error) {
      if (error.message === 'Pago de inscripción no encontrado') {
        return NextResponse.json(
          { message: 'Pago de inscripción no encontrado' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('not configured')) {
        return NextResponse.json(
          { message: 'WhatsApp no está configurado correctamente' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 