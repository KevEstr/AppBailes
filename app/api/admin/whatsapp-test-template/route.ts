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

    console.log('🧪 TEST TEMPLATE HELLO_WORLD - Exacto como Meta');
    console.log('📱 Phone Number ID:', phoneNumberId);
    console.log('🔑 Token length:', accessToken.length);

    const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
    
    // Exactamente como el ejemplo de Meta
    const requestBody = {
      messaging_product: "whatsapp",
      to: "573005771152",
      type: "template",
      template: {
        name: "hello_world",
        language: {
          code: "en_US"
        }
      }
    };
    
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
        suggestion: 'Tu número debe estar agregado como número de prueba en Meta for Developers'
      }, { status: response.status });
    }

    console.log('✅ Template hello_world enviado!');
    return NextResponse.json({
      success: true,
      message: 'Template hello_world enviado exitosamente',
      whatsappResponse: responseData,
      sentTo: "573005771152",
      nextSteps: {
        1: 'Si no recibes el mensaje, agrega tu número como número de prueba en Meta',
        2: 'Ve a: https://developers.facebook.com/apps/',
        3: 'Tu app > WhatsApp > API Setup > Add phone number',
        4: 'Agrega: +57 300 577 1152'
      }
    });

  } catch (error) {
    console.error('💥 Error en test template:', error);
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