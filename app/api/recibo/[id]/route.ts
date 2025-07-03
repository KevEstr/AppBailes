import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receiptId = parseInt(id);
    
    if (isNaN(receiptId)) {
      return NextResponse.json(
        { error: 'ID de recibo inválido' },
        { status: 400 }
      );
    }

    // Buscar el recibo con información del estudiante
    const receipt = await prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        student: true
      }
    });

    if (!receipt) {
      return NextResponse.json(
        { error: 'Recibo no encontrado' },
        { status: 404 }
      );
    }

    // Función para formatear fechas de manera consistente
    const formatDate = (date: Date): string => {
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    // Calcular próximo pago (añadir 1 mes)
    const nextPaymentDate = new Date(receipt.createdAt);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    // Formatear datos para el componente
    const receiptData = {
      id: receipt.id,
      receiptNumber: receipt.id.toString().padStart(4, '0'),
      studentName: receipt.student.name,
      amount: receipt.amount,
      concept: receipt.concept,
      paymentDate: formatDate(new Date(receipt.createdAt)),
      paymentMethod: receipt.paymentMethod,
      receivedBy: 'Sebastian Vasquez Correa',
      nextPaymentDate: formatDate(nextPaymentDate)
    };

    return NextResponse.json({ receipt: receiptData });

  } catch (error) {
    console.error('Error obteniendo recibo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 