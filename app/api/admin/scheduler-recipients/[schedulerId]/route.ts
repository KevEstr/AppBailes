import { NextRequest, NextResponse } from 'next/server';
import { schedulerRecipientService } from '@/lib/scheduler-recipient-service';

// GET /api/admin/scheduler-recipients/[schedulerId] - Obtener destinatarios de un scheduler
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schedulerId: string }> }
) {
  try {
    const { schedulerId } = await params;
    const id = parseInt(schedulerId);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID de scheduler inválido' },
        { status: 400 }
      );
    }

    const recipients = await schedulerRecipientService.getRecipients(id);
    const stats = await schedulerRecipientService.getRecipientStats(id);

    return NextResponse.json({
      recipients,
      stats
    });
  } catch (error) {
    console.error('Error obteniendo destinatarios:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/scheduler-recipients/[schedulerId] - Agregar destinatarios
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schedulerId: string }> }
) {
  try {
    const { schedulerId } = await params;
    const id = parseInt(schedulerId);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID de scheduler inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { studentIds, addedBy } = body;

    if (!studentIds || !Array.isArray(studentIds)) {
      return NextResponse.json(
        { message: 'Se requiere un array de IDs de estudiantes' },
        { status: 400 }
      );
    }

    const addedRecipients = await schedulerRecipientService.addRecipients(id, studentIds, addedBy);

    return NextResponse.json({
      message: `Se agregaron ${addedRecipients.length} destinatarios`,
      added: addedRecipients.length
    });
  } catch (error) {
    console.error('Error agregando destinatarios:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/scheduler-recipients/[schedulerId] - Remover destinatarios
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schedulerId: string }> }
) {
  try {
    const { schedulerId } = await params;
    const id = parseInt(schedulerId);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { message: 'ID de scheduler inválido' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const studentIdsParam = searchParams.get('studentIds');
    
    if (!studentIdsParam) {
      return NextResponse.json(
        { message: 'Se requiere el parámetro studentIds' },
        { status: 400 }
      );
    }

    const studentIds = JSON.parse(studentIdsParam);
    
    if (!Array.isArray(studentIds)) {
      return NextResponse.json(
        { message: 'studentIds debe ser un array' },
        { status: 400 }
      );
    }

    const removedCount = await schedulerRecipientService.removeRecipients(id, studentIds);

    return NextResponse.json({
      message: `Se removieron ${removedCount} destinatarios`,
      removed: removedCount
    });
  } catch (error) {
    console.error('Error removiendo destinatarios:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 