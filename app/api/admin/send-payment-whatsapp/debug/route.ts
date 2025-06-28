import { NextResponse } from 'next/server';
import { WhatsAppService } from '@/lib/whatsapp-service';

export async function GET() {
  try {
    // Verificar configuración
    const config = WhatsAppService.checkConfiguration();
    
    // Probar formato de número
    const phoneTest = WhatsAppService.debugPhoneFormat('573005771152');
    
    // Si está configurado, probar conexión real con Meta
    let metaTest = null;
    if (config.isConfigured) {
      try {
        const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
        
        // Test 1: Verificar que el token sea válido consultando info del número
        const phoneInfoResponse = await fetch(
          `https://graph.facebook.com/v22.0/${phoneNumberId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            }
          }
        );
        
        const phoneInfo = phoneInfoResponse.ok ? await phoneInfoResponse.json() : null;
        
        // Test 2: Intentar enviar un mensaje de prueba (solo verificación, no envío real)
        const testMessageResponse = await fetch(
          `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: '573005771152',
              type: 'text',
              text: {
                body: '🧪 Mensaje de prueba desde Paradise Dance Academy - Ignorar'
              }
            })
          }
        );
        
        let testMessageResult = null;
        if (testMessageResponse.ok) {
          testMessageResult = await testMessageResponse.json();
        } else {
          const errorData = await testMessageResponse.json();
          testMessageResult = { error: errorData, status: testMessageResponse.status };
        }
        
        metaTest = {
          phoneInfo: {
            status: phoneInfoResponse.status,
            data: phoneInfo
          },
          testMessage: {
            status: testMessageResponse.status,
            data: testMessageResult
          }
        };
        
      } catch (error) {
        metaTest = {
          error: 'Error conectando con Meta API',
          details: error instanceof Error ? error.message : 'Error desconocido'
        };
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      configuration: config,
      phoneTest: phoneTest,
      metaApiTest: metaTest,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        hasAccessToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
        hasPhoneNumberId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
        accessTokenLength: process.env.WHATSAPP_ACCESS_TOKEN?.length || 0,
        phoneNumberIdLength: process.env.WHATSAPP_PHONE_NUMBER_ID?.length || 0,
      },
      instructions: {
        step1: "Verificar que las credenciales estén configuradas",
        step2: "Verificar que tu número esté agregado como número de prueba en Meta",
        step3: "Verificar que la aplicación tenga permisos de WhatsApp Business",
        step4: "Si todo está bien, el problema puede ser el token temporal (caduca en 24h)",
        metaConsole: "https://developers.facebook.com/apps/",
        whatsappSetup: "WhatsApp > API Setup > Add phone number"
      }
    });
  } catch (error) {
    console.error('Error en debug de WhatsApp:', error);
    return NextResponse.json(
      { 
        error: 'Error verificando configuración',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 