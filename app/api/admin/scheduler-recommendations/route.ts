import { NextRequest, NextResponse } from 'next/server';
import { schedulerRecipientService } from '@/lib/scheduler-recipient-service';

// GET /api/admin/scheduler-recommendations - Obtener recomendaciones
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schedulerType = searchParams.get('schedulerType') || 'MONTHLY_PAYMENT';
    const targetFilter = searchParams.get('targetFilter') || 'ALL_ACTIVE';
    const customFilter = searchParams.get('customFilter');

    let recommendations;

    if (targetFilter === 'SPECIFIC_STUDENTS' || targetFilter === 'CUSTOM_FILTER') {
      recommendations = await schedulerRecipientService.getStudentsByFilter(targetFilter, customFilter);
    } else {
      recommendations = await schedulerRecipientService.getRecommendations(schedulerType);
    }

    return NextResponse.json({
      recommendations,
      schedulerType,
      targetFilter,
      total: recommendations.length
    });
  } catch (error) {
    console.error('Error obteniendo recomendaciones:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 