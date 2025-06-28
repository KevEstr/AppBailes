import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    console.log('🧪 CURL EXACTO - Replicando comando de Meta');
    console.log('📱 Phone Number ID desde env:', phoneNumberId);
    console.log('🔑 Token desde env (length):', accessToken?.length);
    console.log('🔑 Token desde env (primeros 20 chars):', accessToken?.substring(0, 20));
    
    // Verificar que el token coincida con el que Meta te dio
    const expectedToken = "EAATpgAlmqBMBO3ZAF7nAUiY3OKiWcMG0IChkXUfQ0vBBvm6prCYcNB5ah5Co8cRzLfTepehJZA42VuMQ0VGb6XLLZAKgrJ0ZA14hO2TucZA4Prq7J6GmtnNeRB9ZC3aL9RacOuYCoUPQ6KumOxD2Gx9oEMcLtIbK2V2OAUm45egBhGBK6lKLr3UyciYOY2bWRsjMfyRCXwH9ZAEjU9dLJZCH9bPZCdFHdPN0ZD";
    const expectedPhoneId = "671992555997755";
    
    console.log('✅ Token coincide:', accessToken === expectedToken);
    console.log('✅ Phone ID coincide:', phoneNumberId === expectedPhoneId);
    
    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'WhatsApp credentials not configured' },
        { status: 500 }
      );
    }

    // URL exacta del curl
    const url = `https://graph.facebook.com/v22.0/671992555997755/messages`;
    
    // Body exacto del curl
    const requestBody = {
      "messaging_product": "whatsapp", 
      "to": "573005771152", 
      "type": "template", 
      "template": { 
        "name": "hello_world", 
        "language": { 
          "code": "en_US" 
        } 
      }
    };
    
    console.log('🔗 URL exacta:', url);
    console.log('📋 Request Body exacto:', JSON.stringify(requestBody, null, 2));
    
    // Headers exactos del curl
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${expectedToken}`,  // Usando el token exacto
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📨 Response Status:', response.status);
    console.log('📨 Response Headers:', Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error('❌ Error exacto:', responseData);
      
      // Casos específicos de error
      if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Token inválido o expirado',
          suggestion: 'Genera un nuevo token en Meta for Developers',
          details: responseData
        }, { status: 401 });
      }
      
      if (response.status === 400 && responseData.error?.code === 131026) {
        return NextResponse.json({
          success: false,
          error: 'Número no autorizado para recibir mensajes',
          suggestion: 'Agrega +57 300 577 1152 como número de prueba en Meta for Developers > WhatsApp > API Setup > Add phone number',
          details: responseData
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Error de WhatsApp API',
        details: responseData
      }, { status: response.status });
    }

    console.log('✅ ¡ÉXITO! Template enviado exactamente como Meta');
    return NextResponse.json({
      success: true,
      message: '✅ Mensaje enviado exactamente como el curl de Meta',
      whatsappResponse: responseData,
      verification: {
        tokenMatches: accessToken === expectedToken,
        phoneIdMatches: phoneNumberId === expectedPhoneId,
        urlUsed: url,
        requestSent: requestBody
      },
      troubleshooting: {
        ifNoMessage: [
          "1. Verifica que agregaste +57 300 577 1152 como número de prueba en Meta",
          "2. Ve a https://developers.facebook.com/apps/ > Tu app > WhatsApp > API Setup",
          "3. En la sección 'To' debe aparecer tu número",
          "4. Si no está, haz clic '+ Add phone number' y agrega +57 300 577 1152",
          "5. Verifica el número cuando Meta te lo pida"
        ]
      }
    });

  } catch (error) {
    console.error('💥 Error ejecutando curl exacto:', error);
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