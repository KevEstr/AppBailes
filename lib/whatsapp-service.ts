interface WhatsAppMessage {
  studentName: string;
  parentPhone: string;
  paymentLink: string;
  amount: number;
  period: string;
  dueDate: string;
  sport?: 'DANCE' | 'VOLLEYBALL'; // Campo opcional para seleccionar template
  cutoffDay?: number; // Día de corte de la clase
}

interface PendingPaymentMessage {
  studentName: string;
  parentPhone: string;
  amount: number;
  period: string;
  dueDate: string;
  sport?: 'DANCE' | 'VOLLEYBALL';
  paymentId: number; // ID del pago pendiente
}

interface EventMessage {
  studentName: string;
  parentPhone: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventDescription?: string;
  additionalInfo?: string;
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
  private initialized: boolean = false;

  constructor() {
    // No inicializar durante el constructor para evitar errores en build time
    this.accessToken = '';
    this.phoneNumberId = '';
    this.baseUrl = '';
  }

  private initialize() {
    if (this.initialized) return;

    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.baseUrl = `https://graph.facebook.com/v22.0/${this.phoneNumberId}/messages`;
    
    console.log('🔧 WhatsApp Service Initialized:');
    console.log('   📱 Phone Number ID:', this.phoneNumberId);
    console.log('   🔗 URL:', this.baseUrl);
    console.log('   🔑 Token length:', this.accessToken.length);
    console.log('   🔑 Token preview:', this.accessToken.substring(0, 10) + '...');
    
    if (!this.accessToken || !this.phoneNumberId) {
      throw new Error('WhatsApp credentials not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.');
    }

    this.initialized = true;
  }

  /**
   * Envía un mensaje de pago por WhatsApp - Sistema inteligente con fallback
   */
  async sendPaymentMessage(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    this.initialize(); // Lazy initialization
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
  async sendCustomPaymentTemplate(data: WhatsAppMessage, formattedPhone: string): Promise<WhatsAppResponse> {
    this.initialize(); // Ensure baseUrl, token and phoneNumberId are set
    console.log('🎯 sendCustomPaymentTemplate llamado con:');
    console.log('   📱 Teléfono formateado recibido:', formattedPhone);
    console.log('   📊 Datos:', data);
    console.log('   🔗 URL destino:', this.baseUrl);
    
    // Obtener el día de corte de los datos o usar 30 por defecto
    const cutoffDay = data.cutoffDay || 30;
    
    // El período ya viene formateado correctamente desde el endpoint
    const periodWithDay = data.period;
    // Seleccionar template según el deporte
    console.log('🏃 Deporte detectado:', data.sport);
    console.log('📆 Día de corte utilizado:', cutoffDay);
    const templateName = data.sport === 'VOLLEYBALL' 
      ? 'utility_payment_reminder_paradise_volley' 
      : 'utility_payment_reminder_paradise';
    
    console.log('📋 Template seleccionado:', templateName);

    const requestBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName, // Template específico por deporte
        language: {
          code: 'es_CO'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: data.studentName // {{1}} - Estudiante (ej: "Juan Pérez")
              },
              {
                type: 'text',
                text: `$${data.amount.toLocaleString()}` // {{2}} - Monto (ej: "$150,000")
              },
              {
                type: 'text',
                text: periodWithDay // {{3}} - Período con día de corte (ej: "15 de Enero 2025" o "30 de Enero 2025")
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

    console.log('📨 Response Status:', response.status);
    console.log('📨 Response Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseData = await response.json();
    console.log('📨 Response Body (Custom Template):', JSON.stringify(responseData, null, 2));

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
    this.initialize(); // Lazy initialization
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
   * Envía mensaje de pago pendiente (nuevo sistema sin formularios)
   */
  async sendPendingPaymentMessage(data: PendingPaymentMessage): Promise<WhatsAppResponse> {
    this.initialize(); // Lazy initialization
    try {
      // Formatear el número de teléfono (debe incluir código de país sin +)
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      console.log('📤 Preparando envío de WhatsApp (PAGO PENDIENTE):');
      console.log('   👤 Estudiante:', data.studentName);
      console.log('   📱 Teléfono original:', data.parentPhone);
      console.log('   📱 Teléfono formateado:', formattedPhone);
      console.log('   💰 Monto:', data.amount);
      console.log('   📅 Período:', data.period);
      console.log('   🆔 Payment ID:', data.paymentId);
      
      const message = this.createPendingPaymentMessage(data);
      
      const requestBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      };
      
      console.log('📋 Request Body (PAGO PENDIENTE):', JSON.stringify(requestBody, null, 2));
      
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

      console.log('✅ Mensaje de pago pendiente enviado exitosamente');
      return responseData;
    } catch (error) {
      console.error('💥 Error sending WhatsApp pending payment message:', error);
      throw error;
    }
  }

  /**
   * Envía un mensaje usando plantilla (más profesional)
   */
  async sendPaymentTemplate(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    this.initialize(); // Lazy initialization
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
              code: 'es_CO'
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
  formatPhoneNumber(phone: string): string {
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
    this.initialize(); // Lazy initialization
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
   * Crea el mensaje para pagos pendientes (sin link de formulario)
   */
  private createPendingPaymentMessage(data: PendingPaymentMessage): string {
    return `🩰 *Paradise Dance Academy*

Hola! Te recordamos que tienes un pago pendiente para *${data.studentName}*.

📋 *Detalles del pago:*
• Estudiante: ${data.studentName}
• Período: ${data.period}
• Monto: $${data.amount.toLocaleString()}
• Fecha límite: ${data.dueDate}

💳 *Para realizar el pago:*
Puedes pagar en efectivo, transferencia bancaria o tarjeta. Una vez realizado el pago, nuestro administrador lo marcará como recibido en el sistema.

📱 *Información importante:*
• Guarda tu comprobante de pago
• El pago será confirmado por nuestro equipo
• Recibirás notificación cuando sea procesado

¿Tienes alguna pregunta? ¡No dudes en contactarnos!

*Paradise Dance Academy* ✨`;
  }

  /**
   * Envía un mensaje de evento usando template personalizado
   */
  async sendEventMessage(data: EventMessage): Promise<WhatsAppResponse> {
    this.initialize(); // Lazy initialization
    try {
      // Formatear el número de teléfono (debe incluir código de país sin +)
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      console.log('📤 Preparando envío de WhatsApp (EVENTO):');
      console.log('   👤 Estudiante:', data.studentName);
      console.log('   📱 Teléfono original:', data.parentPhone);
      console.log('   📱 Teléfono formateado:', formattedPhone);
      console.log('   🎉 Evento:', data.eventName);
      console.log('   📅 Fecha:', data.eventDate);
      console.log('   🕐 Hora:', data.eventTime);
      console.log('   📍 Lugar:', data.eventLocation);
      console.log('   🔗 URL destino:', this.baseUrl);
      
      // Formatear fecha para el template
      const eventDate = new Date(data.eventDate);
      const formattedDate = eventDate.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });

      const requestBody = {
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: 'utility_event_reminder', // CAMBIAR POR LA REAL
          language: {
            code: 'es_CO'
          },
          components: [
            {
              type: 'body',
              parameters: [
                {
                  type: 'text',
                  text: data.eventName // {{1}} - Nombre del evento
                },
                {
                  type: 'text',
                  text: formattedDate // {{2}} - Fecha formateada
                },
                {
                  type: 'text',
                  text: data.eventTime // {{3}} - Hora del evento
                },
                {
                  type: 'text',
                  text: data.eventLocation // {{4}} - Lugar del evento
                },
                {
                  type: 'text',
                  text: data.eventDescription || 'Sin descripción' // {{5}} - Descripción
                },
                {
                  type: 'text',
                  text: data.additionalInfo || 'Sin información adicional' // {{6}} - Información adicional
                }
              ]
            }
          ]
        }
      };
      
      console.log('📋 Template de evento:', JSON.stringify(requestBody, null, 2));
      
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
      console.log('📨 Response Body (Event Template):', JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        throw new Error(`Event template error: ${JSON.stringify(responseData)}`);
      }

      console.log('✅ Template de evento enviado exitosamente');
      return responseData;
    } catch (error) {
      console.error('💥 Error en sistema de WhatsApp para eventos:', error);
      throw error;
    }
  }

  /**
   * Envía un recordatorio de pago
   */
  async sendPaymentReminder(data: WhatsAppMessage): Promise<WhatsAppResponse> {
    this.initialize(); // Lazy initialization
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
    this.initialize(); // Lazy initialization
    try {
      console.log('🔍 Verificando conexión con WhatsApp API...');
      console.log('   📱 Phone Number ID:', this.phoneNumberId);
      console.log('   🔗 URL de verificación:', `https://graph.facebook.com/v22.0/${this.phoneNumberId}`);
      
      const response = await fetch(`https://graph.facebook.com/v22.0/${this.phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      console.log('📨 Response Status:', response.status);
      const responseData = await response.json();
      console.log('📨 Response Data:', JSON.stringify(responseData, null, 2));

      return response.ok;
    } catch (error) {
      console.error('❌ Error verifying WhatsApp connection:', error);
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
   * Método estático para formatear números de teléfono
   */
  // Eliminado por duplicación; usar la versión de instancia `formatPhoneNumber`

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

  // ========== NOTIFICACIONES DE COMPROBANTES ==========

  /**
   * Envía notificación de comprobante aprobado
   */
  async sendProofApprovedNotification(data: {
    studentName: string;
    parentPhone: string;
    period: string;
    amount: number;
    paymentMethod: string;
    receiptUrl?: string;
    isPartialPayment?: boolean;
    expectedAmount?: number;
    remainingAmount?: number;
    paymentStatus?: string;
    nextPaymentDate?: string;
  }): Promise<WhatsAppResponse> {
    this.initialize(); // Lazy initialization
    try {
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      console.log('📤 Enviando notificación de comprobante APROBADO:');
      console.log('   👤 Estudiante:', data.studentName);
      console.log('   📱 Teléfono:', formattedPhone);
      console.log('   💰 Monto:', data.amount);
      console.log('   💸 Pago parcial:', data.isPartialPayment ? 'SÍ' : 'NO');
      console.log('   📅 Período recibido:', data.period);
      console.log('   📅 Próximo pago:', data.nextPaymentDate);
      
      // PRIORIDAD 1: Intentar template personalizado
      try {
        console.log('🎯 Intentando template personalizado de aprobación...');
        return await this.sendProofApprovedTemplate(data, formattedPhone);
      } catch (templateError) {
        console.log('⚠️ Template personalizado falló, usando fallback...');
        console.error('Error con template personalizado:', templateError);
      }
      
      // FALLBACK: Template hello_world + mensaje de seguimiento
      console.log('🔄 Usando template hello_world + notificación de aprobación...');
      return await this.sendProofApprovedWithHelloWorld(data, formattedPhone);
      
    } catch (error) {
      console.error('💥 Error enviando notificación de aprobación:', error);
      throw error;
    }
  }

  /**
   * Envía notificación de comprobante rechazado
   */
  async sendProofRejectedNotification(data: {
    studentName: string;
    parentPhone: string;
    period: string;
    amount: number;
    paymentMethod: string;
    rejectionReason: string;
    paymentLink?: string;
  }): Promise<WhatsAppResponse> {
    this.initialize(); // Lazy initialization
    try {
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      console.log('📤 Enviando notificación de comprobante RECHAZADO:');
      console.log('   👤 Estudiante:', data.studentName);
      console.log('   📱 Teléfono:', formattedPhone);
      console.log('   ❌ Motivo:', data.rejectionReason);
      
      // PRIORIDAD 1: Intentar template personalizado
      try {
        console.log('🎯 Intentando template personalizado de rechazo...');
        return await this.sendProofRejectedTemplate(data, formattedPhone);
      } catch (templateError) {
        console.log('⚠️ Template personalizado falló, usando fallback...');
        console.error('Error con template personalizado:', templateError);
      }
      
      // FALLBACK: Template hello_world + mensaje de seguimiento
      console.log('🔄 Usando template hello_world + notificación de rechazo...');
      return await this.sendProofRejectedWithHelloWorld(data, formattedPhone);
      
    } catch (error) {
      console.error('💥 Error enviando notificación de rechazo:', error);
      throw error;
    }
  }

  /**
   * Template personalizado para comprobante aprobado
   */
  private async sendProofApprovedTemplate(data: {
    studentName: string;
    period: string;
    amount: number;
    paymentMethod: string;
    receiptUrl?: string;
    isPartialPayment?: boolean;
    expectedAmount?: number;
    remainingAmount?: number;
    paymentStatus?: string;
    nextPaymentDate?: string;
  }, formattedPhone: string): Promise<WhatsAppResponse> {
    
    // Usar template diferente según si es pago parcial o completo
    const templateName = data.isPartialPayment 
      ? 'proof_approved_partial_paradise'
      : 'utility_proof_approved_paradise';

    const requestBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'es_CO'
        },
        components: [
          {
            type: 'body',
            parameters: data.isPartialPayment ? [
              { type: 'text', text: data.studentName },                                    // {{1}} Estudiante
              { type: 'text', text: data.period },                                        // {{2}} Período
              { type: 'text', text: `$${data.amount.toLocaleString()}` },                // {{3}} Monto pagado
              { type: 'text', text: data.paymentMethod },                                // {{4}} Método
              { type: 'text', text: `$${(data.expectedAmount || 0).toLocaleString()}` }, // {{5}} Monto total
              { type: 'text', text: `$${data.amount.toLocaleString()}` },                // {{6}} Pagado
              { type: 'text', text: `$${(data.remainingAmount || 0).toLocaleString()}` },// {{7}} Saldo pendiente
              { type: 'text', text: data.receiptUrl || 'Sin recibo disponible' },        // {{8}} URL recibo
            ] : [
              { type: 'text', text: data.studentName },                                    // {{1}} Estudiante
              { type: 'text', text: data.period },                                        // {{2}} Período
              { type: 'text', text: `$${data.amount.toLocaleString()}` },                // {{3}} Monto
              { type: 'text', text: data.paymentMethod },                                // {{4}} Método
              { type: 'text', text: data.nextPaymentDate || 'Fecha por confirmar' },      // {{5}} Próximo pago
              { type: 'text', text: data.receiptUrl || 'Sin recibo disponible' },        // {{6}} URL recibo
              
            ]
          }
        ]
      }
    };
    
    console.log(`📋 Template de aprobación (${data.isPartialPayment ? 'parcial' : 'completo'}):`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    console.log('📨 Response (Proof Approved Template):', response.status, responseData);

    if (!response.ok) {
      throw new Error(`Proof approved template error: ${JSON.stringify(responseData)}`);
    }

    console.log(`✅ Template de aprobación ${data.isPartialPayment ? 'parcial' : 'completo'} enviado exitosamente`);
    return responseData;
  }

  /**
   * Template personalizado para comprobante rechazado
   */
  private async sendProofRejectedTemplate(data: {
    studentName: string;
    period: string;
    amount: number;
    paymentMethod: string;
    rejectionReason: string;
    paymentLink?: string;
  }, formattedPhone: string): Promise<WhatsAppResponse> {
    const requestBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'proof_rejected_paradise', // Template aprobado para notificaciones de rechazo
        language: {
          code: 'es_CO'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: data.studentName // {{1}} - Nombre del estudiante
              },
              {
                type: 'text',
                text: data.period // {{2}} - Período
              },
              {
                type: 'text',
                text: `$${data.amount.toLocaleString()}` // {{3}} - Monto
              },
              {
                type: 'text',
                text: data.paymentMethod // {{4}} - Método de pago
              },
              {
                type: 'text',
                text: data.rejectionReason // {{5}} - Motivo del rechazo
              }
            ]
          }
        ]
      }
    };
    
    console.log('📋 Template de rechazo:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    console.log('📨 Response (Proof Rejected Template):', response.status, responseData);

    if (!response.ok) {
      throw new Error(`Proof rejected template error: ${JSON.stringify(responseData)}`);
    }

    console.log('✅ Template de rechazo enviado exitosamente');
    return responseData;
  }

  /**
   * Fallback: Hello world + mensaje de aprobación
   */
  private async sendProofApprovedWithHelloWorld(data: {
    studentName: string;
    period: string;
    amount: number;
    paymentMethod: string;
    receiptUrl?: string;
    isPartialPayment?: boolean;
    expectedAmount?: number;
    remainingAmount?: number;
    paymentStatus?: string;
    nextPaymentDate?: string;
  }, formattedPhone: string): Promise<WhatsAppResponse> {
    // 1. Enviar template hello_world
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
    
    console.log('📋 Enviando hello_world para aprobación...');
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(helloWorldBody)
    });

    const responseData = await response.json();
    console.log('📨 Response (Hello World - Approved):', response.status, responseData);

    if (!response.ok) {
      throw new Error(`Hello world template error: ${JSON.stringify(responseData)}`);
    }

    // 2. Programar mensaje de seguimiento
    setTimeout(async () => {
      try {
        await this.sendProofApprovedFollowUp(data, formattedPhone);
      } catch (error) {
        console.error('Error en mensaje de aprobación:', error);
      }
    }, 2000);

    console.log('✅ Hello world enviado, notificación de aprobación programada');
    return responseData;
  }

  /**
   * Fallback: Hello world + mensaje de rechazo
   */
  private async sendProofRejectedWithHelloWorld(data: {
    studentName: string;
    period: string;
    amount: number;
    paymentMethod: string;
    rejectionReason: string;
    paymentLink?: string;
  }, formattedPhone: string): Promise<WhatsAppResponse> {
    // 1. Enviar template hello_world
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
    
    console.log('📋 Enviando hello_world para rechazo...');
    
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(helloWorldBody)
    });

    const responseData = await response.json();
    console.log('📨 Response (Hello World - Rejected):', response.status, responseData);

    if (!response.ok) {
      throw new Error(`Hello world template error: ${JSON.stringify(responseData)}`);
    }

    // 2. Programar mensaje de seguimiento
    setTimeout(async () => {
      try {
        await this.sendProofRejectedFollowUp(data, formattedPhone);
      } catch (error) {
        console.error('Error en mensaje de rechazo:', error);
      }
    }, 2000);

    console.log('✅ Hello world enviado, notificación de rechazo programada');
    return responseData;
  }

  /**
   * Mensaje de seguimiento para aprobación
   */
  private async sendProofApprovedFollowUp(data: {
    studentName: string;
    period: string;
    amount: number;
    paymentMethod: string;
    receiptUrl?: string;
    isPartialPayment?: boolean;
    expectedAmount?: number;
    remainingAmount?: number;
    paymentStatus?: string;
    nextPaymentDate?: string;
  }, formattedPhone: string): Promise<void> {
    const message = data.isPartialPayment 
      ? `¡Hola! Te informamos que tu comprobante de pago ha sido APROBADO.

👤 Estudiante: ${data.studentName}
📅 Período: ${data.period}
💰 Monto pagado: $${data.amount.toLocaleString()}
💳 Método: ${data.paymentMethod}
✅ Estado: Pago parcial confirmado

📊 Resumen del pago:
* Monto total del período: $${(data.expectedAmount || 0).toLocaleString()}
* Pagado hasta ahora: $${data.amount.toLocaleString()}
* Saldo pendiente: $${(data.remainingAmount || 0).toLocaleString()}

⏰ Próximo paso:
Debes completar el pago del saldo restante para evitar deudas.

📅 Próximo pago: ${data.nextPaymentDate || 'Fecha por confirmar'}

📄 Tu recibo digital:
${data.receiptUrl || 'Sin recibo disponible'}`
      : `¡Hola! Te informamos que tu comprobante de pago ha sido APROBADO.

👤 Estudiante: ${data.studentName}
📅 Período: ${data.period}
💰 Monto pagado: $${data.amount.toLocaleString()}
💳 Método: ${data.paymentMethod}
✅ Estado: Pago completo confirmado

📅 Próximo pago: ${data.nextPaymentDate || 'Fecha por confirmar'}

📄 Tu recibo digital:
${data.receiptUrl || 'Sin recibo disponible'}`;

    const followUpBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: message
      }
    };

    console.log('📋 Enviando mensaje de seguimiento de aprobación...');

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
      console.log('✅ Mensaje de seguimiento de aprobación enviado exitosamente');
    } else {
      console.log('⚠️ Mensaje de seguimiento de aprobación falló');
    }
  }

  /**
   * Mensaje de seguimiento para rechazo
   */
  private async sendProofRejectedFollowUp(data: {
    studentName: string;
    period: string;
    amount: number;
    paymentMethod: string;
    rejectionReason: string;
    paymentLink?: string;
  }, formattedPhone: string): Promise<void> {
    const rejectedMessage = `❌ *Comprobante Rechazado - Paradise Dance Academy*

Hola, te informamos que tu comprobante de pago ha sido *RECHAZADO*.

👤 *Estudiante:* ${data.studentName}
📅 *Período:* ${data.period}
💰 *Monto enviado:* $${data.amount.toLocaleString()}
📋 *Método:* ${data.paymentMethod}
❌ *Estado:* Comprobante rechazado

🔍 *Motivo del rechazo:*
${data.rejectionReason}

📱 *¿Qué hacer ahora?*
1. Verifica que el comprobante sea claro y legible
2. Asegúrate de que el monto sea correcto
3. Vuelve a subir el comprobante corregido${data.paymentLink ? `\n   Enlace: ${data.paymentLink}` : ''}
4. Si tienes dudas, contáctanos

*Paradise Dance Academy* ✨`;

    const followUpBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: rejectedMessage
      }
    };

    console.log('📋 Enviando mensaje de rechazo...');

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(followUpBody)
    });

    const responseData = await response.json();
    console.log('📨 Rejected follow-up response:', response.status, responseData);

    if (response.ok) {
      console.log('✅ Mensaje de rechazo enviado exitosamente');
    } else {
      console.log('⚠️ Mensaje de rechazo falló (normal en modo desarrollo)');
    }
  }

  /**
   * Envía mensaje de inscripción exitosa con template específico
   */
  async sendEnrollmentTemplate(data: {
    parentPhone: string;
    studentName: string;
    sport: string;
    concept: string;
    amount: number;
    paymentUrl: string;
    contactPhone: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string; data?: any }> {
    this.initialize(); // Lazy initialization
    try {
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      console.log('📱 Enviando WhatsApp de inscripción...');
      console.log('   👤 Estudiante:', data.studentName);
      console.log('   🏃 Deporte:', data.sport);
      console.log('   💰 Monto:', data.amount);
      console.log('   📱 Teléfono:', formattedPhone);
      
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
            name: 'enrollment_success_paradise', // Template específico para inscripciones
            language: {
              code: 'es_CO'
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
                    text: data.sport
                  },
                  {
                    type: 'text',
                    text: data.concept
                  },
                  {
                    type: 'text',
                    text: `$${data.amount.toLocaleString()}`
                  },
                  {
                    type: 'text',
                    text: data.paymentUrl
                  },
                  {
                    type: 'text',
                    text: data.contactPhone
                  }
                ]
              }
            ]
          }
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ WhatsApp de inscripción enviado exitosamente:', result);
        return {
          success: true,
          messageId: result.messages?.[0]?.id,
          data: result
        };
      } else {
        console.error('❌ Error enviando WhatsApp de inscripción:', result);
        
        // Fallback: intentar con template genérico
        console.log('🔄 Intentando fallback con template genérico...');
        return await this.sendFallbackEnrollmentMessage(data);
      }
    } catch (error) {
      console.error('❌ Error en sendEnrollmentTemplate:', error);
      
      // Fallback: intentar con template genérico
      console.log('🔄 Intentando fallback con template genérico...');
      return await this.sendFallbackEnrollmentMessage(data);
    }
  }

  /**
   * Fallback: envía mensaje de inscripción usando template genérico + mensaje de seguimiento
   */
  private async sendFallbackEnrollmentMessage(data: {
    parentPhone: string;
    studentName: string;
    sport: string;
    concept: string;
    amount: number;
    paymentUrl: string;
    contactPhone: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string; data?: any }> {
    try {
      const formattedPhone = this.formatPhoneNumber(data.parentPhone);
      
      // Primero enviar template genérico
      const templateResponse = await fetch(this.baseUrl, {
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
            name: 'hello_world',
            language: {
              code: 'es_CO'
            }
          }
        })
      });

      if (templateResponse.ok) {
        // Esperar un momento y enviar mensaje de seguimiento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const followUpResponse = await fetch(this.baseUrl, {
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
              body: `¡INSCRIPCIÓN EXITOSA!\n\n¡Hola! Nos complace informarte que la inscripción ha sido procesada exitosamente.\n\n👤 Estudiante: ${data.studentName}\n🏃 Deporte: ${data.sport}\n📝 Concepto: ${data.concept}\n💰 Monto de inscripción: $${data.amount.toLocaleString()}\n🔗 Enlace de pago: ${data.paymentUrl}\n\n✅ ¡Bienvenido a Paradise!\n\nPara completar el proceso:\n1. Haz clic en el enlace de pago\n2. Completa los datos requeridos\n3. Sube el comprobante de pago\n4. Recibirás confirmación inmediata\n\n¿Dudas? Llámanos o escríbenos al ${data.contactPhone}\n\n¡Gracias por confiar en nosotros! ✨`
            }
          })
        });

        const result = await followUpResponse.json();
        
        if (followUpResponse.ok) {
          console.log('✅ Fallback WhatsApp enviado exitosamente');
          return {
            success: true,
            messageId: result.messages?.[0]?.id,
            data: result
          };
        } else {
          console.error('❌ Error en fallback WhatsApp:', result);
          return {
            success: false,
            error: result.error?.message || 'Error en fallback',
            data: result
          };
        }
      } else {
        console.error('❌ Error enviando template genérico');
        return {
          success: false,
          error: 'No se pudo enviar ningún mensaje'
        };
      }
    } catch (error) {
      console.error('❌ Error en fallback:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error en fallback'
      };
    }
  }
}

// Lazy initialization - solo crear cuando se necesite
let _whatsappService: WhatsAppService | undefined;

export function getWhatsAppService(): WhatsAppService {
  _whatsappService ??= new WhatsAppService();
  return _whatsappService;
}

// Para compatibilidad con código existente
export const whatsappService = new Proxy({} as WhatsAppService, {
  get(target, prop) {
    const service = getWhatsAppService();
    const value = (service as any)[prop];
    return typeof value === 'function' ? value.bind(service) : value;
  }
}); 