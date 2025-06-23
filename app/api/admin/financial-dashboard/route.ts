import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/financial-dashboard - Dashboard financiero con métricas clave
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [totalIncome, monthlyStats, serviceStats, recentTransactions] = await Promise.all([
      prisma.receipt.aggregate({
        where: { createdAt: { gte: startDate, lte: now } },
        _sum: { amount: true },
        _count: true
      }),
      prisma.receipt.aggregate({
        where: {
          createdAt: { gte: startDate, lte: now },
          concept: { contains: 'mensualidad' }
        },
        _sum: { amount: true },
        _count: true
      }),
      prisma.receipt.aggregate({
        where: {
          createdAt: { gte: startDate, lte: now },
          concept: { not: { contains: 'mensualidad' } }
        },
        _sum: { amount: true },
        _count: true
      }),
      prisma.receipt.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { student: { select: { name: true, phone: true } } }
      })
    ]);

    const dashboard = {
      period: { type: period, startDate, endDate: now },
      summary: {
        totalIncome: totalIncome._sum.amount || 0,
        totalTransactions: totalIncome._count || 0,
        monthlyPayments: {
          amount: monthlyStats._sum.amount || 0,
          count: monthlyStats._count || 0
        },
        servicePayments: {
          amount: serviceStats._sum.amount || 0,
          count: serviceStats._count || 0
        }
      },
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        concept: tx.concept,
        paymentMethod: tx.paymentMethod,
        studentName: tx.student.name,
        createdAt: tx.createdAt
      }))
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching financial dashboard:', error);
    return NextResponse.json({ message: 'Error interno del servidor' }, { status: 500 });
  }
}

function formatPeriodLabel(period: string, startDate: Date): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  switch (period) {
    case 'month':
      return `${months[startDate.getMonth()]} ${startDate.getFullYear()}`;
    case 'quarter':
      const quarter = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${quarter} ${startDate.getFullYear()}`;
    case 'year':
      return `${startDate.getFullYear()}`;
    default:
      return 'Período actual';
  }
}

function getMonthLabel(month: number): string {
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  return months[month - 1] || 'N/A';
} 