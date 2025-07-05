import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// GET /api/admin/student-debt-info/[studentId] - Obtener información detallada de deudas
export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const studentId = parseInt(params.studentId);
    
    if (isNaN(studentId)) {
      return NextResponse.json(
        { message: 'ID de estudiante inválido' },
        { status: 400 }
      );
    }

    const debtInfo = await monthlyPaymentService.getStudentDebtInfo(studentId);
    
    return NextResponse.json(debtInfo);
  } catch (error) {
    console.error('Error al obtener información de deudas:', error);
    
    if (error instanceof Error && error.message === 'Estudiante no encontrado') {
      return NextResponse.json(
        { message: 'Estudiante no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 