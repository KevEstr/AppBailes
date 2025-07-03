import { NextRequest, NextResponse } from 'next/server';
import { DigitalReceiptService } from '@/lib/digital-receipt-service';

// POST /api/admin/test-digital-receipt - Generar recibo de prueba
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      studentName, 
      amount, 
      concept, 
      paymentMethod = 'Transferencia',
      notes = 'Recibo de prueba generado desde el admin'
    } = body;

    // Validaciones
    if (!studentName || !amount || !concept) {
      return NextResponse.json(
        { error: 'Nombre del estudiante, monto y concepto son obligatorios' },
        { status: 400 }
      );
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser un número válido mayor a 0' },
        { status: 400 }
      );
    }

    // Buscar estudiante por nombre (usar el primero si existe, si no crear datos ficticios)
    const { prisma } = await import('@/lib/prisma');
    
    let student = await prisma.student.findFirst({
      where: {
        name: {
          contains: studentName,
          mode: 'insensitive'
        }
      }
    });

    let receiptData;

    if (student) {
      console.log(`📄 Generando recibo de prueba para estudiante existente: ${student.name}`);
      
      // Usar estudiante real
      receiptData = await DigitalReceiptService.createReceiptFromGenericPayment(
        student.id,
        parseFloat(amount),
        concept,
        paymentMethod,
        notes
      );
    } else {
      console.log(`📄 Generando recibo de prueba con datos ficticios para: ${studentName}`);
      
      // Crear recibo con datos simulados (no guardarlo en DB)
      receiptData = {
        id: Date.now(), // ID temporal
        receiptNumber: Date.now().toString().slice(-4),
        studentName,
        amount: parseFloat(amount),
        concept,
        paymentDate: new Date().toLocaleDateString('es-ES'),
        nextPaymentDate: concept.toLowerCase().includes('mensualidad') 
          ? new Date(new Date().getTime() + (30 * 24 * 60 * 60 * 1000)).toLocaleDateString('es-ES')
          : undefined,
        paymentMethod,
        receivedBy: 'Sebastian Vasquez Correa'
      };
    }

    const receiptUrl = DigitalReceiptService.generateReceiptUrl(receiptData.id);

    return NextResponse.json({
      success: true,
      message: 'Recibo de prueba generado exitosamente',
      receiptData,
      receiptUrl,
      isRealStudent: !!student
    });

  } catch (error) {
    console.error('Error generando recibo de prueba:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 