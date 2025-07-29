import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { EnrollmentPaymentService } from '@/lib/enrollment-payment-service';

const enrollmentPaymentService = new EnrollmentPaymentService();

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
        { message: 'ID de estudiante es requerido' },
        { status: 400 }
      );
    }

    // Enviar WhatsApp de inscripción
    const result = await enrollmentPaymentService.sendEnrollmentPaymentWhatsApp(studentId);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp de inscripción enviado exitosamente',
      result
    });

  } catch (error) {
    console.error('Error enviando WhatsApp de inscripción:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 