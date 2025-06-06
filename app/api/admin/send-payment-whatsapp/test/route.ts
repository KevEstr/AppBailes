import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured' },
        { status: 500 }
      );
    }

    console.log('🧪 Iniciando test de WhatsApp directo');
    console.log('📱 Phone Number ID:', phoneNumberId);
    console.log('🔑 Token length:', accessToken.length);

    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    const phoneNumber = '573005771152'; // Tu número directamente
    
    // Primero probar con template hello_world (siempre funciona)
    const requestBody = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };
    
    // Alternativa con mensaje de texto (comentado para primera prueba)
    /*
    const requestBody = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: {
        body: '🧪 TEST SIMPLE - Paradise Dance Academy\n\nEste es un mensaje de prueba directo.\n\nSi ves este mensaje, WhatsApp funciona correctamente! ✅'
      }
    };
    */
    
    console.log('🔗 URL:', url);
    console.log('📋 Request Body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📨 Response Status:', response.status);
    console.log('📨 Response OK:', response.ok);

    const responseData = await response.json();
    console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('❌ Error en respuesta:', responseData);
      return NextResponse.json({
        success: false,
        error: 'WhatsApp API Error',
        status: response.status,
        details: responseData,
        request: {
          url,
          body: requestBody
        }
      }, { status: response.status });
    }

    console.log('✅ Test exitoso!');
    return NextResponse.json({
      success: true,
      message: 'Mensaje de prueba enviado',
      whatsappResponse: responseData,
      sentTo: phoneNumber,
      request: {
        url,
        body: requestBody
      }
    });

  } catch (error) {
    console.error('💥 Error en test:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 