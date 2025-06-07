import { NextRequest, NextResponse } from 'next/server';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// POST /api/admin/test-payment-notifications - Probar notificaciones de comprobantes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body; // 'APPROVED' o 'REJECTED'

    // Crear un comprobante mock para testing
    const mockProof = {
      id: 999,
      amount: 150000,
      paymentMethod: 'TRANSFER',
      paymentForm: {
        monthlyPayment: {
          student: {
            id: 1,
            name: 'Juan Pérez (TEST)',
            phone: '573005771152' // Reemplaza con tu número para testing
          },
          period: {
            id: 1,
            name: 'Diciembre 2024',
            dueDate: new Date('2024-12-31')
          }
        }
      }
    };

    // Simular revisión del comprobante
    let reviewNotes = '';
    if (type === 'APPROVED') {
      reviewNotes = 'Comprobante aprobado automáticamente en modo de prueba';
    } else if (type === 'REJECTED') {
      reviewNotes = 'Comprobante rechazado en modo de prueba - La imagen no es clara';
    }

    // Llamar al método privado de notificación directamente
    // Como es privado, vamos a simular el envío directo
    const student = mockProof.paymentForm.monthlyPayment.student;
    const period = mockProof.paymentForm.monthlyPayment.period;

    let message = '';
    
    if (type === 'APPROVED') {
      message = `✅ *Comprobante Aprobado - Paradise Dance Academy*

¡Hola! Te informamos que tu comprobante de pago ha sido *APROBADO*.

👤 *Estudiante:* ${student.name}
📅 *Período:* ${period.name}
💰 *Monto:* $${mockProof.amount.toLocaleString()}
📋 *Método:* Transferencia
✅ *Estado:* Pago confirmado

🎉 *¡Perfecto!* El pago ha sido registrado exitosamente en nuestro sistema.

*Paradise Dance Academy* ✨
¡Gracias por ser parte de nuestra familia de baile! 🩰`;
    } else if (type === 'REJECTED') {
      message = `❌ *Comprobante Rechazado - Paradise Dance Academy*

Hola, te informamos que tu comprobante de pago ha sido *RECHAZADO*.

👤 *Estudiante:* ${student.name}
📅 *Período:* ${period.name}
💰 *Monto enviado:* $${mockProof.amount.toLocaleString()}
📋 *Método:* Transferencia
❌ *Estado:* Comprobante rechazado

🔍 *Motivo del rechazo:*
${reviewNotes}

📱 *¿Qué hacer ahora?*
1. Verifica que el comprobante sea claro y legible
2. Asegúrate de que el monto sea correcto
3. Vuelve a subir el comprobante corregido
4. Si tienes dudas, contáctanos

*Paradise Dance Academy* ✨`;
    }

    // Enviar WhatsApp de prueba
    await sendTestWhatsApp(student.phone, message);

    return NextResponse.json({
      success: true,
      message: `Notificación de prueba enviada (${type})`,
      data: {
        student: student.name,
        phone: student.phone,
        type: type,
        messagePreview: message.substring(0, 200) + '...'
      }
    });

  } catch (error) {
    console.error('Error en test de notificaciones:', error);
    return NextResponse.json(
      { 
        error: 'Error enviando notificación de prueba',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Función auxiliar para enviar WhatsApp de prueba
async function sendTestWhatsApp(phoneNumber: string, message: string) {
  try {
    // Formatear el número de teléfono
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const cleanPhone = !formattedPhone.startsWith('57') && formattedPhone.length === 10 
      ? '57' + formattedPhone 
      : formattedPhone;

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      console.log('⚠️ WhatsApp no configurado, mensaje de prueba no enviado');
      return { success: false, reason: 'WhatsApp no configurado' };
    }

    const requestBody = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: {
        body: message
      }
    };

    console.log('📤 Enviando mensaje de prueba a:', cleanPhone);

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`WhatsApp API Error: ${JSON.stringify(errorData)}`);
    }

    const responseData = await response.json();
    console.log('✅ Mensaje de prueba enviado:', responseData);
    
    return { success: true, response: responseData };
    
  } catch (error) {
    console.error('Error enviando WhatsApp de prueba:', error);
    throw error;
  }
} 