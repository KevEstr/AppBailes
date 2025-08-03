import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatPhoneForDisplay } from '@/lib/phone-utils';

// GET /api/admin/students - Obtener estudiantes con información de pago
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';

    let whereClause: any = {};

    // Aplicar filtros
    switch (filter) {
      case 'withDebt':
        // Estudiantes con deuda pendiente
        whereClause = {
          monthlyPayments: {
            some: {
              status: 'PENDING',
              expectedAmount: { gt: 0 }
            }
          }
        };
        break;
      case 'overdue':
        // Estudiantes con pagos vencidos
        whereClause = {
          monthlyPayments: {
            some: {
              status: 'PENDING',
              period: {
                dueDate: { lt: new Date() }
              }
            }
          }
        };
        break;
      case 'partial':
        // Estudiantes con pagos parciales
        whereClause = {
          monthlyPayments: {
            some: {
              status: 'PARTIAL'
            }
          }
        };
        break;
      case 'withPhone':
        whereClause = {
          phone: { not: null },
          NOT: { phone: '' }
        };
        break;
      case 'withoutPhone':
        whereClause = {
          OR: [
            { phone: null },
            { phone: '' }
          ]
        };
        break;
      case 'active':
        whereClause = { isActive: true };
        break;
      case 'inactive':
        whereClause = { isActive: false };
        break;
      default:
        // Todos los estudiantes
        break;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        monthlyPayments: {
          where: {
            status: { in: ['PENDING', 'PARTIAL'] }
          },
          include: {
            period: true
          },
          orderBy: {
            period: {
              dueDate: 'desc'
            }
          },
          take: 1 // Solo el más reciente
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Procesar datos para el frontend
    const processedStudents = students.map(student => {
      const latestPayment = student.monthlyPayments[0];
      let debtAmount = 0;
      let paymentStatus = 'CURRENT';

      if (latestPayment) {
        debtAmount = latestPayment.expectedAmount - (latestPayment.paidAmount || 0);
        
        if (debtAmount > 0) {
          if (latestPayment.period.dueDate < new Date()) {
            paymentStatus = 'OVERDUE';
          } else if (latestPayment.status === 'PARTIAL') {
            paymentStatus = 'PARTIAL';
          } else {
            paymentStatus = 'PENDING';
          }
        }
      }

      return {
        id: student.id,
        name: student.name,
        phone: formatPhoneForDisplay(student.phone),
        isActive: student.isActive,
        debtAmount: debtAmount > 0 ? debtAmount : 0,
        paymentStatus,
        lastPayment: latestPayment?.period?.name || null
      };
    });

    return NextResponse.json({
      students: processedStudents,
      total: processedStudents.length
    });
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 