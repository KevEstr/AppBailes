import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp-service';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

interface Params {
  id: string;
}

// GET /api/admin/scheduled-whatsapp/[id] - Obtener envío programado
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    
    const scheduledSend = await prisma.scheduledWhatsAppSend.findUnique({
      where: { id: parseInt(id) },
      include: {
        period: true
      }
    });

    if (!scheduledSend) {
      return NextResponse.json(
        { message: 'Envío programado no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(scheduledSend);
  } catch (error) {
    console.error('Error al obtener envío programado:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/scheduled-whatsapp/[id] - Actualizar envío programado
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, scheduledDate, intervalMinutes, status } = body;

    const scheduledSend = await prisma.scheduledWhatsAppSend.findUnique({
      where: { id: parseInt(id) }
    });

    if (!scheduledSend) {
      return NextResponse.json(
        { message: 'Envío programado no encontrado' },
        { status: 404 }
      );
    }

    // No permitir editar si ya está en ejecución o completado
    if (scheduledSend.status === 'RUNNING' || scheduledSend.status === 'COMPLETED') {
      return NextResponse.json(
        { message: 'No se puede editar un envío en ejecución o completado' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (scheduledDate) {
      const scheduled = new Date(scheduledDate);
      if (scheduled <= new Date() && status !== 'CANCELLED') {
        return NextResponse.json(
          { message: 'La fecha programada debe ser futura' },
          { status: 400 }
        );
      }
      updateData.scheduledDate = scheduled;
    }
    if (intervalMinutes) updateData.intervalMinutes = intervalMinutes;
    if (status) updateData.status = status;

    const updatedSend = await prisma.scheduledWhatsAppSend.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        period: true
      }
    });

    return NextResponse.json({
      message: 'Envío programado actualizado exitosamente',
      scheduledSend: updatedSend
    });

  } catch (error) {
    console.error('Error al actualizar envío programado:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/scheduled-whatsapp/[id] - Cancelar envío programado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;

    const scheduledSend = await prisma.scheduledWhatsAppSend.findUnique({
      where: { id: parseInt(id) }
    });

    if (!scheduledSend) {
      return NextResponse.json(
        { message: 'Envío programado no encontrado' },
        { status: 404 }
      );
    }

    if (scheduledSend.status === 'RUNNING') {
      return NextResponse.json(
        { message: 'No se puede cancelar un envío en ejecución' },
        { status: 400 }
      );
    }

    await prisma.scheduledWhatsAppSend.update({
      where: { id: parseInt(id) },
      data: {
        status: 'CANCELLED'
      }
    });

    return NextResponse.json({
      message: 'Envío programado cancelado exitosamente'
    });

  } catch (error) {
    console.error('Error al cancelar envío programado:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 