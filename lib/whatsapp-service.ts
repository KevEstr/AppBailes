interface WhatsAppMessage {
  studentName: string;
  parentPhone: string;
  paymentLink: string;
  amount: number;
  period: string;
  dueDate: string;
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private baseUrl: string;

  constructor() {
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.baseUrl = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;
    
    console.log('🔧 WhatsApp Service Initialized:');
    console.log('   📱 Phone Number ID:', this.phoneNumberId);
    console.log('   🔗 URL:', this.baseUrl);
    console.log('   🔑 Token length:', this.accessToken.length);
    
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp credentials not configured');
    }
  }

  /**
   * Envía un mensaje de pago por WhatsApp - Sistema inteligente con fallback
   */
  async sendPaymentMessage(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      // Formatear el número de teléfono (debe incluir código de país sin +)
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      console.log('📤 Preparando envío de WhatsApp (SISTEMA INTELIGENTE):');
      console.log('   👤 Estudiante:', data.studentName);
      console.log('   📱 Teléfono original:', data.parentPhone);
      console.log('   📱 Teléfono formateado:', formattedPhone);
      console.log('   🔗 URL destino:', this.baseUrl);
      
      // PRIORIDAD 1: Intentar template personalizado (si está aprobado)
      try {
        console.log('🎯 Intentando template personalizado...');
        return await this.sendCustomPaymentTemplate(data, formattedPhone);
      } catch (customError) {
        console.log('⚠️ Template personalizado falló, usando fallback...');
        console.error('Error con template personalizado:', customError);
      }
      
      // FALLBACK: Template hello_world + mensaje de seguimiento
      console.log('🔄 Usando template hello_world + información de pago...');
      return await this.sendHelloWorldWithFollowUp(data, formattedPhone);
      
    } catch (error) {
      console.error('💥 Error en sistema de WhatsApp:', error);
      throw error;
    }
  }

  /**
   * Template personalizado profesional para pagos (APROBADO POR META)
   */
  private async sendCustomPaymentTemplate(data: WhatsAppMessage, formattedPhone: string): Promise<WhatsAppResponse> {
    const requestBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'payment_reminder_paradise', // Nombre del template aprobado
        language: {
          code: 'es'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: data.studentName // {{1}} - Nombre del estudiante (ej: "Juan")
              },
              {
                type: 'text',
                text: data.period // {{2}} - Período (ej: "Junio")
              },
              {
                type: 'text',
                text: data.dueDate // {{3}} - Fecha vencimiento (ej: "Julio")
              },
              {
                type: 'text',
                text: data.paymentLink // {{4}} - Enlace de pago (reemplaza "Con Prioridad")
              }
            ]
          }
        ]
      }
    };
    
    console.log('📋 Template personalizado:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    console.log('📨 Response (Custom Template):', response.status, responseData);

    if (!response.ok) {
      throw new Error(`Custom template error: ${JSON.stringify(responseData)}`);
    }

    console.log('✅ Template personalizado enviado exitosamente');
    return responseData;
  }

  /**
   * Fallback: Template hello_world seguido de mensaje informativo
   */
  private async sendHelloWorldWithFollowUp(data: WhatsAppMessage, formattedPhone: string): Promise<WhatsAppResponse> {
    // 1. Enviar template hello_world (garantizado)
    const helloWorldBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US'
        }
      }
    };
    
    console.log('📋 Enviando hello_world...');
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(helloWorldBody)
    });

    const responseData = await response.json();
    console.log('📨 Response (Hello World):', response.status, responseData);

    if (!response.ok) {
      throw new Error(`Hello world template error: ${JSON.stringify(responseData)}`);
    }

    // 2. Enviar mensaje de seguimiento con información (después de 2 segundos)
    setTimeout(async () => {
      try {
        await this.sendFollowUpMessage(data, formattedPhone);
      } catch (error) {
        console.error('Error en mensaje de seguimiento:', error);
      }
    }, 2000);

    console.log('✅ Hello world enviado, mensaje de seguimiento programado');
    return responseData;
  }

  /**
   * Mensaje de seguimiento con información del pago
   */
  private async sendFollowUpMessage(data: WhatsAppMessage, formattedPhone: string): Promise<void> {
    const followUpMessage = `🩰 *Paradise Dance Academy - Información de Pago*

👤 *Estudiante:* ${data.studentName}
💰 *Monto:* $${data.amount.toLocaleString()}
📅 *Período:* ${data.period}
⏰ *Vence:* ${data.dueDate}

🔗 *Enlace de pago:*
${data.paymentLink}

📱 *Instrucciones:*
1️⃣ Realiza el pago por el monto exacto
2️⃣ Toma una foto clara del comprobante
3️⃣ Súbela al formulario usando el enlace
4️⃣ Recibirás confirmación en 24 horas

❓ *¿Tienes dudas?* ¡No dudes en contactarnos!

*Paradise Dance Academy* ✨`;

    const followUpBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: followUpMessage
      }
    };

    console.log('📋 Enviando mensaje de seguimiento...');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(followUpBody)
    });

    const responseData = await response.json();
    console.log('📨 Follow-up response:', response.status, responseData);

    if (response.ok) {
      console.log('✅ Mensaje de seguimiento enviado exitosamente');
    } else {
      console.log('⚠️ Mensaje de seguimiento falló (normal en modo desarrollo)');
    }
  }

  /**
   * MÉTODO ALTERNATIVO: Envía mensaje de texto (puede fallar)
   */
  async sendPaymentMessageText(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      // Formatear el número de teléfono (debe incluir código de país sin +)
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      console.log('📤 Preparando envío de WhatsApp (TEXTO):');
      console.log('   👤 Estudiante:', data.studentName);
      console.log('   📱 Teléfono original:', data.parentPhone);
      console.log('   📱 Teléfono formateado:', formattedPhone);
      console.log('   🔗 URL destino:', this.baseUrl);
      
      const message = this.createPaymentMessage(data);
      
      const requestBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      };
      
      console.log('📋 Request Body (TEXTO):', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📨 Response Status:', response.status);
      console.log('📨 Response Headers:', Object.fromEntries(response.headers.entries()));

      const responseData = await response.json();
      console.log('📨 Response Body:', JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        console.error('❌ WhatsApp API Error:', responseData);
        throw new Error(`WhatsApp API Error: ${JSON.stringify(responseData)}`);
      }

      console.log('✅ Mensaje de texto enviado exitosamente');
      return responseData;
    } catch (error) {
      console.error('💥 Error sending WhatsApp text message:', error);
      throw error;
    }
  }

  /**
   * Envía un mensaje usando plantilla (más profesional)
   */
  async sendPaymentTemplate(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    try {
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'payment_reminder', // Nombre de tu plantilla aprobada
            language: {
              code: 'es'
            },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: data.studentName
                  },
                  {
                    type: 'text',
                    text: data.period
                  },
                  {
                    type: 'text',
                    text: `$${data.amount.toLocaleString()}`
                  },
                  {
                    type: 'text',
                    text: data.dueDate
                  }
                ]
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [
                  {
                    type: 'text',
                    text: data.paymentLink.split('/payment/')[1] // Solo el ID del formulario
                  }
                ]
              }
            ]
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`WhatsApp API Error: ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending WhatsApp template:', error);
      throw error;
    }
  }

  /**
   * Formatea el número de teléfono para WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Remover espacios, guiones y caracteres especiales
    let cleaned = phone.replace(/\D/g, '');
    
    // Si no empieza con código de país, agregar Colombia (57)
    if (!cleaned.startsWith('57') && cleaned.length === 10) {
      cleaned = '57' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Envía el template hello_world para probar conectividad
   */
  async sendHelloWorldTemplate(phoneNumber: string): Promise<WhatsAppResponse> {
    try {
      console.log('📤 Enviando template hello_world a:', phoneNumber);
      
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
      
      console.log('📋 Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📨 Response Status:', response.status);
      const responseData = await response.json();
      console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        console.error('❌ WhatsApp API Error:', responseData);
        throw new Error(`WhatsApp API Error: ${JSON.stringify(responseData)}`);
      }

      console.log('✅ Template hello_world enviado exitosamente');
      return responseData;
    } catch (error) {
      console.error('💥 Error sending hello_world template:', error);
      throw error;
    }
  }

  /**
   * Crea el mensaje de texto para el pago
   */
  private createPaymentMessage(data: WhatsAppMessage): string {
    return `🩰 *Paradise Dance Academy*

Hola! Te enviamos el enlace para realizar el pago mensual de *${data.studentName}*.

📋 *Detalles del pago:*
• Estudiante: ${data.studentName}
• Período: ${data.period}
• Monto: $${data.amount.toLocaleString()}
• Fecha límite: ${data.dueDate}

💳 *Para pagar, haz clic en el siguiente enlace:*
${data.paymentLink}

📱 *Instrucciones:*
1. Realiza el pago por el monto exacto
2. Toma una foto clara del comprobante
3. Súbela al formulario
4. Recibirás confirmación en 24 horas

¿Tienes alguna pregunta? ¡No dudes en contactarnos!

*Paradise Dance Academy* ✨`;
  }

  /**
   * Envía un recordatorio de pago
   */
  async sendPaymentReminder(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    const reminderMessage = `🔔 *Recordatorio de Pago - Paradise Dance Academy*

Hola! Te recordamos que el pago de *${data.studentName}* está próximo a vencer.

📅 *Fecha límite:* ${data.dueDate}
💰 *Monto:* $${data.amount.toLocaleString()}

Puedes realizar el pago usando el mismo enlace que te enviamos anteriormente:
${data.paymentLink}

¡Gracias por tu atención! 🩰✨`;

    try {
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: reminderMessage
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`WhatsApp API Error: ${JSON.stringify(errorData)}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending WhatsApp reminder:', error);
      throw error;
    }
  }

  /**
   * Verifica el estado del servicio WhatsApp
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Error verifying WhatsApp connection:', error);
      return false;
    }
  }

  /**
   * Verifica si las credenciales están configuradas
   */
  static checkConfiguration(): { 
    isConfigured: boolean; 
    accessToken: boolean; 
    phoneNumberId: boolean; 
    errors: string[] 
  } {
    const accessToken = !!process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
    const errors: string[] = [];

    if (!accessToken) {
      errors.push('WHATSAPP_ACCESS_TOKEN no está configurado');
    }
    if (!phoneNumberId) {
      errors.push('WHATSAPP_PHONE_NUMBER_ID no está configurado');
    }

    console.log('🔍 Verificación de WhatsApp:');
    console.log('✅ Access Token:', accessToken ? 'Configurado' : '❌ Faltante');
    console.log('✅ Phone Number ID:', phoneNumberId ? 'Configurado' : '❌ Faltante');
    
    return {
      isConfigured: accessToken && phoneNumberId,
      accessToken,
      phoneNumberId,
      errors
    };
  }

  /**
   * Método de debug para probar formateo de números
   */
  static debugPhoneFormat(phone: string): { original: string; formatted: string; isValid: boolean } {
    const cleaned = phone.replace(/\D/g, '');
    let formatted = cleaned;
    
    if (!cleaned.startsWith('57') && cleaned.length === 10) {
      formatted = '57' + cleaned;
    }
    
    const isValid = formatted.length >= 12 && formatted.startsWith('57');
    
    console.log('📱 Debug formato teléfono:');
    console.log('   Original:', phone);
    console.log('   Limpio:', cleaned);
    console.log('   Formateado:', formatted);
    console.log('   ¿Válido?:', isValid ? '✅' : '❌');
    
    return { original: phone, formatted, isValid };
  }
}

export const whatsappService = new WhatsAppService(); 