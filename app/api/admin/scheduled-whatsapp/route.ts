import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/admin/scheduled-whatsapp - Obtener envíos programados
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const periodId = searchParams.get('periodId');

    let where = {};
    if (periodId) {
      where = { periodId: parseInt(periodId) };
    }

    const scheduledSends = await prisma.scheduledWhatsAppSend.findMany({
      where,
      include: {
        period: true
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    });

    return NextResponse.json(scheduledSends);
  } catch (error) {
    console.error('Error al obtener envíos programados:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/scheduled-whatsapp - Crear envío programado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      periodId, 
      name, 
      scheduledDate, 
      intervalMinutes = 5 
    } = body;

    // Validaciones
    if (!periodId || !name || !scheduledDate) {
      return NextResponse.json(
        { message: 'Período, nombre y fecha son obligatorios' },
        { status: 400 }
      );
    }

    const scheduled = new Date(scheduledDate);
    if (scheduled <= new Date()) {
      return NextResponse.json(
        { message: 'La fecha programada debe ser futura' },
        { status: 400 }
      );
    }

    // Verificar que existe el período
    const period = await prisma.paymentPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return NextResponse.json(
        { message: 'Período no encontrado' },
        { status: 404 }
      );
    }

    // Contar total de formularios de pago del período
    const totalForms = await prisma.paymentForm.count({
      where: {
        periodId: periodId,
        status: 'ACTIVE'
      }
    });

    // Crear envío programado
    const scheduledSend = await prisma.scheduledWhatsAppSend.create({
      data: {
        periodId,
        name,
        scheduledDate: scheduled,
        intervalMinutes,
        totalMessages: totalForms,
        createdBy: 'admin@academia.com' // TODO: Obtener del usuario logueado
      },
      include: {
        period: true
      }
    });

    return NextResponse.json({
      message: 'Envío programado creado exitosamente',
      scheduledSend
    });

  } catch (error) {
    console.error('Error al crear envío programado:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 