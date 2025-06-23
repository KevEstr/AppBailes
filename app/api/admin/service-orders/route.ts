import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/service-orders - Obtener órdenes de servicios
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const studentId = searchParams.get('studentId');

    const whereClause: any = {};
    if (status) whereClause.status = status;
    if (studentId) whereClause.studentId = parseInt(studentId);

    const orders = await prisma.serviceOrder.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        service: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching service orders:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/service-orders - Crear nueva orden de servicio
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { studentId, serviceId, quantity, unitPrice, scheduledDate, notes } = data;

    // Validaciones
    if (!studentId || !serviceId || !quantity || !unitPrice) {
      return NextResponse.json(
        { message: 'Todos los campos requeridos deben ser proporcionados' },
        { status: 400 }
      );
    }

    const totalAmount = parseFloat(unitPrice) * parseInt(quantity);

    const order = await prisma.serviceOrder.create({
      data: {
        studentId: parseInt(studentId),
        serviceId: parseInt(serviceId),
        quantity: parseInt(quantity),
        unitPrice: parseFloat(unitPrice),
        totalAmount,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes
      },
      include: {
        student: true,
        service: true
      }
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating service order:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 