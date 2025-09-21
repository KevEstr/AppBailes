import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/nextauth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { message: 'paymentId es requerido' },
        { status: 400 }
      );
    }

    // Buscar recibos relacionados con el pago mensual
    const receipts = await prisma.receipt.findMany({
      where: {
        monthlyPaymentId: parseInt(paymentId)
      },
      include: {
        student: true,
        monthlyPayment: {
          include: {
            period: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(receipts);

  } catch (error) {
    console.error('Error obteniendo recibos:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
