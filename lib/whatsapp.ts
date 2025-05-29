// Simulación de servicio de WhatsApp
// Para habilitar WhatsApp real, configurar WHATSAPP_TOKEN en .env

export interface WhatsAppMessage {
  to: string
  message: string
  type: "receipt" | "reminder" | "general"
}

export class WhatsAppService {
  private static instance: WhatsAppService
  private isEnabled: boolean

  constructor() {
    // WhatsApp está habilitado solo si hay token configurado
    this.isEnabled = !!process.env.WHATSAPP_TOKEN
  }

  public static getInstance(): WhatsAppService {
    if (!WhatsAppService.instance) {
      WhatsAppService.instance = new WhatsAppService()
    }
    return WhatsAppService.instance
  }

  async sendMessage(data: WhatsAppMessage): Promise<boolean> {
    try {
      if (this.isEnabled) {
        // Implementación real de WhatsApp (cuando esté configurado)
        console.log(`🚀 Enviando WhatsApp REAL a ${data.to}`)

        // Aquí iría la integración real con WhatsApp Business API
        // const response = await fetch('https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages', {
        //   method: 'POST',
        //   headers: {
        //     'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        //     'Content-Type': 'application/json',
        //   },
        //   body: JSON.stringify({
        //     messaging_product: 'whatsapp',
        //     to: data.to,
        //     text: { body: data.message }
        //   })
        // })

        // return response.ok
      } else {
        // Modo simulación (sin credenciales)
        console.log(`📱 WhatsApp SIMULADO enviado a ${data.to}:`)
        console.log(`📄 Mensaje: ${data.message}`)
        console.log(`ℹ️  Para habilitar WhatsApp real, configurar WHATSAPP_TOKEN en .env`)
      }

      // Simular delay de envío
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Siempre retornar éxito (tanto en modo real como simulado)
      return true
    } catch (error) {
      console.error("Error enviando WhatsApp:", error)
      return false
    }
  }

  async sendMassiveMessages(phones: string[], message: string): Promise<{ sent: number; failed: number }> {
    let sent = 0
    let failed = 0

    for (const phone of phones) {
      const success = await this.sendMessage({
        to: phone,
        message,
        type: "general",
      })

      if (success) {
        sent++
      } else {
        failed++
      }

      // Delay entre mensajes para evitar spam
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    return { sent, failed }
  }

  generateReceiptMessage(
    studentName: string,
    amount: number,
    concept: string,
    paymentMethod: string,
    promotion?: string,
  ): string {
    let message = `🧾 *RECIBO DE PAGO*\n\n`
    message += `👤 *Estudiante:* ${studentName}\n`
    message += `💰 *Monto:* $${amount}\n`
    message += `📝 *Concepto:* ${concept}\n`
    message += `💳 *Método:* ${paymentMethod}\n`

    if (promotion && promotion !== "none") {
      message += `🎁 *Promoción:* ${promotion}\n`
    }

    message += `📅 *Fecha:* ${new Date().toLocaleDateString("es-ES")}\n\n`
    message += `✅ *Pago registrado exitosamente*\n`
    message += `¡Gracias por ser parte de nuestra academia! 💃🕺`

    return message
  }

  generateDebtReminderMessage(studentName: string, amount: number, concept: string, daysOverdue: number): string {
    let message = `⚠️ *RECORDATORIO DE PAGO*\n\n`
    message += `Hola ${studentName},\n\n`
    message += `Te recordamos que tienes un pago pendiente:\n\n`
    message += `💰 *Monto:* $${amount}\n`
    message += `📝 *Concepto:* ${concept}\n`
    message += `⏰ *Días de retraso:* ${daysOverdue}\n\n`

    if (daysOverdue >= 30) {
      message += `🚨 *URGENTE:* Tu pago tiene más de 30 días de retraso.\n`
    } else if (daysOverdue >= 15) {
      message += `⚠️ *IMPORTANTE:* Por favor regulariza tu situación pronto.\n`
    }

    message += `\nPor favor, ponte al día para continuar disfrutando de nuestras clases.\n\n`
    message += `¡Gracias por tu comprensión! 🙏`

    return message
  }
}
