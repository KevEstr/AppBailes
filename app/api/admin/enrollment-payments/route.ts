import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/enrollment-payments - Listar pagos de inscripción
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Construir filtros
    const whereClause: any = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { student: { name: { contains: search, mode: 'insensitive' } } },
        { student: { phone: { contains: search, mode: 'insensitive' } } },
        { student: { id: { contains: search, mode: 'insensitive' } } }
      ];
    }

    // Obtener pagos de inscripción
    const [enrollmentPayments, total] = await Promise.all([
      prisma.enrollmentPayment.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          },
          paymentForms: {
            include: {
              paymentProofs: {
                orderBy: { createdAt: 'desc' },
                take: 1
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.enrollmentPayment.count({ where: whereClause })
    ]);

    // Procesar datos para el frontend
    const processedPayments = enrollmentPayments.map((payment: any) => {
      const latestForm = payment.paymentForms[0];
      const latestProof = latestForm?.paymentProofs[0];

      return {
        id: payment.id,
        studentId: payment.studentId,
        studentName: payment.student.name,
        studentPhone: payment.student.phone,
        sport: payment.sport,
        expectedAmount: payment.expectedAmount,
        paidAmount: payment.paidAmount,
        status: payment.status,
        paymentDate: payment.paymentDate,
        createdAt: payment.createdAt,
        hasActiveForm: latestForm?.status === 'ACTIVE',
        hasProof: !!latestProof,
        latestProofStatus: latestProof?.status || null
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      payments: processedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Error obteniendo pagos de inscripción:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/enrollment-payments - Crear pago de inscripción manualmente
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { studentId, sport } = body;

    if (!studentId || !sport) {
      return NextResponse.json(
        { message: 'ID de estudiante y deporte son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el estudiante existe
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });

    if (!student) {
      return NextResponse.json(
        { message: 'Estudiante no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no tenga ya un pago de inscripción
    const existingPayment = await prisma.enrollmentPayment.findUnique({
      where: { studentId }
    });

    if (existingPayment) {
      return NextResponse.json(
        { message: 'El estudiante ya tiene un pago de inscripción' },
        { status: 400 }
      );
    }

    // Crear pago de inscripción
    const enrollmentPayment = await prisma.enrollmentPayment.create({
      data: {
        studentId,
        sport,
        expectedAmount: sport === 'DANCE' ? 20000 : 20000, // $20,000 para ambos
        status: 'PENDING'
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Pago de inscripción creado exitosamente',
      payment: enrollmentPayment
    });

  } catch (error) {
    console.error('Error creando pago de inscripción:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 