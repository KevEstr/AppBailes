import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { testNumber } = body;
    
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured' },
        { status: 500 }
      );
    }

    console.log('🧪 TEST MÚLTIPLES NÚMEROS');
    console.log('📱 Número a probar:', testNumber || '573005771152');
    
    const phoneToTest = testNumber || '573005771152';
    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    
    // Probar primero con template hello_world
    const templateBody = {
      "messaging_product": "whatsapp", 
      "to": phoneToTest, 
      "type": "template", 
      "template": { 
        "name": "hello_world", 
        "language": { 
          "code": "en_US" 
        } 
      }
    };
    
    console.log('📋 Enviando template hello_world a:', phoneToTest);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(templateBody)
    });

    const responseData = await response.json();
    
    console.log('📨 Response Status:', response.status);
    console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('❌ Error:', responseData);
      
      if (response.status === 400 && responseData.error?.code === 131026) {
        return NextResponse.json({
          success: false,
          error: `Número ${phoneToTest} no está autorizado`,
          suggestion: `Agrega ${phoneToTest} como número de prueba en Meta for Developers`,
          details: responseData
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Error de WhatsApp API',
        details: responseData
      }, { status: response.status });
    }

    // Si el envío fue exitoso, enviar también un mensaje de texto simple
    const textBody = {
      "messaging_product": "whatsapp",
      "to": phoneToTest,
      "type": "text",
      "text": {
        "body": `🧪 TEST SIMPLE\n\nHola! Este es un mensaje de prueba para verificar la entrega.\n\nNúmero probado: ${phoneToTest}\n\nSi ves este mensaje, ¡WhatsApp funciona! ✅`
      }
    };
    
    console.log('📋 Enviando mensaje de texto...');
    
    const textResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(textBody)
    });

    const textResponseData = await textResponse.json();
    console.log('📨 Text Response:', JSON.stringify(textResponseData, null, 2));

    return NextResponse.json({
      success: true,
      message: `Tests enviados a ${phoneToTest}`,
      results: {
        template: {
          status: response.status,
          data: responseData
        },
        text: {
          status: textResponse.status,
          data: textResponseData
        }
      },
      troubleshooting: {
        ifNoMessages: [
          "1. Verifica configuración de privacidad en WhatsApp",
          "2. Asegúrate de que 'Quién puede escribirme' esté en 'Todos'", 
          "3. Verifica que WhatsApp esté actualizado",
          "4. Reinicia WhatsApp completamente",
          "5. Verifica que no tengas filtros de spam activos"
        ]
      }
    });

  } catch (error) {
    console.error('💥 Error en test múltiple:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 