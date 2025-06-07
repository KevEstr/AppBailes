import { NextRequest, NextResponse } from 'next/server';
import { whatsappService } from '@/lib/whatsapp-service';

// POST /api/admin/test-proof-notifications - Probar notificaciones de comprobantes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, phoneNumber } = body; // 'APPROVED' o 'REJECTED', y el número de teléfono

    // Validaciones
    if (!type || !['APPROVED', 'REJECTED'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo debe ser APPROVED o REJECTED' },
        { status: 400 }
      );
    }

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Número de teléfono es obligatorio' },
        { status: 400 }
      );
    }

    // Datos de prueba
    const testData = {
      studentName: 'Juan Pérez (PRUEBA)',
      parentPhone: phoneNumber,
      period: 'Diciembre 2024',
      amount: 150000,
      paymentMethod: 'Transferencia'
    };

    let result;
    let message = '';

    if (type === 'APPROVED') {
      console.log('🧪 Probando notificación de APROBACIÓN...');
      
      result = await whatsappService.sendProofApprovedNotification(testData);
      
      message = `✅ Notificación de APROBACIÓN enviada exitosamente`;
      
    } else if (type === 'REJECTED') {
      console.log('🧪 Probando notificación de RECHAZO...');
      
      const rejectionData = {
        ...testData,
        rejectionReason: 'Comprobante rechazado en modo de prueba - La imagen no es clara o el monto no coincide',
        paymentLink: 'https://tu-dominio.com/payment/test-form-id'
      };
      
      result = await whatsappService.sendProofRejectedNotification(rejectionData);
      
      message = `❌ Notificación de RECHAZO enviada exitosamente`;
    }

    return NextResponse.json({
      success: true,
      message,
      data: {
        type,
        student: testData.studentName,
        phone: testData.parentPhone,
        period: testData.period,
        amount: testData.amount,
        whatsappResponse: result
      }
    });

  } catch (error) {
    console.error('💥 Error en test de notificaciones de comprobantes:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error enviando notificación de prueba',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 