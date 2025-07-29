import { prisma } from "@/lib/prisma";
import { generateId } from "@/lib/utils";
import { whatsappService } from "@/lib/whatsapp-service";
import { DigitalReceiptService } from "@/lib/digital-receipt-service";

export class EnrollmentPaymentService {
  // ========== CONFIGURACIÓN DE TARIFAS DE INSCRIPCIÓN ==========

  /**
   * Obtiene la tarifa de inscripción según el deporte
   */
  getEnrollmentFee(sport: 'DANCE' | 'VOLLEYBALL'): number {
    switch (sport) {
      case 'DANCE':
        return 20000; // $20,000 para baile
      case 'VOLLEYBALL':
        return 20000; // $20,000 para voleibol
      default:
        return 20000; // Tarifa por defecto
    }
  }

  /**
   * Obtiene el número de teléfono según el deporte
   */
  getContactPhone(sport: 'DANCE' | 'VOLLEYBALL'): string {
    switch (sport) {
      case 'DANCE':
        return '3205656520';
      case 'VOLLEYBALL':
        return '3128984535';
      default:
        return '3205656520';
    }
  }

  // ========== CREACIÓN DE PAGOS DE INSCRIPCIÓN ==========

  /**
   * Crea un pago de inscripción para un estudiante
   */
  async createEnrollmentPayment(studentId: string, sport: 'DANCE' | 'VOLLEYBALL') {
    try {
      console.log(`🎯 Creando pago de inscripción para estudiante ${studentId} en ${sport}`);

      // Verificar que el estudiante existe
      const student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        throw new Error('Estudiante no encontrado');
      }

      // Verificar que no tenga ya un pago de inscripción
      const existingPayment = await prisma.enrollmentPayment.findUnique({
        where: { studentId }
      });

      if (existingPayment) {
        console.log(`⚠️ El estudiante ${studentId} ya tiene un pago de inscripción`);
        return existingPayment;
      }

      const enrollmentFee = this.getEnrollmentFee(sport);

      // Crear el pago de inscripción
      const enrollmentPayment = await prisma.enrollmentPayment.create({
        data: {
          studentId,
          sport,
          expectedAmount: enrollmentFee,
          status: 'PENDING'
        }
      });

      console.log(`✅ Pago de inscripción creado: ID ${enrollmentPayment.id} por $${enrollmentFee.toLocaleString()}`);

      // Los datos de inscripción ya se crean en el API de registro
      // No necesitamos actualizar StudentEnrollmentData aquí
      console.log('✅ Datos de inscripción ya están en StudentEnrollmentData');

      return enrollmentPayment;
    } catch (error) {
      console.error('❌ Error creando pago de inscripción:', error);
      throw error;
    }
  }

  // ========== FORMULARIOS DE PAGO ==========

  /**
   * Genera formulario de pago para inscripción
   */
  async generateEnrollmentPaymentForm(studentId: string) {
    try {
      const enrollmentPayment = await prisma.enrollmentPayment.findUnique({
        where: { studentId },
        include: {
          student: true
        }
      });

      if (!enrollmentPayment) {
        throw new Error('Pago de inscripción no encontrado');
      }

      if (enrollmentPayment.status === 'PAID') {
        throw new Error('La inscripción ya ha sido pagada');
      }

      // Verificar si ya existe un formulario activo
      const existingForm = await prisma.enrollmentPaymentForm.findFirst({
        where: {
          enrollmentPaymentId: enrollmentPayment.id,
          status: { in: ["ACTIVE", "USED"] },
        },
      });

      if (existingForm) {
        console.log(`⚠️ Ya existe un formulario activo para la inscripción del estudiante ${studentId}`);
        return {
          ...existingForm,
          url: `/enrollment-payment/${existingForm.id}`,
        };
      }

      const formId = generateId();

      const paymentForm = await prisma.enrollmentPaymentForm.create({
        data: {
          id: formId,
          studentId: enrollmentPayment.studentId,
          enrollmentPaymentId: enrollmentPayment.id,
          studentName: enrollmentPayment.student.name,
          sport: enrollmentPayment.sport,
          amount: enrollmentPayment.expectedAmount,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        },
      });

      console.log(`✅ Formulario de pago de inscripción creado: ${formId}`);

      return {
        ...paymentForm,
        url: `/enrollment-payment/${formId}`,
      };
    } catch (error) {
      console.error('❌ Error generando formulario de pago de inscripción:', error);
      throw error;
    }
  }

  /**
   * Obtiene un formulario de pago de inscripción
   */
  async getEnrollmentPaymentForm(formId: string) {
    const form = await prisma.enrollmentPaymentForm.findUnique({
      where: { id: formId },
      include: {
        student: true,
        enrollmentPayment: true,
        paymentProofs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!form) {
      throw new Error('Formulario de pago no encontrado');
    }

    return form;
  }

  // ========== COMPROBANTES DE PAGO ==========

  /**
   * Sube un comprobante de pago de inscripción
   */
  async uploadEnrollmentPaymentProof(
    formId: string,
    data: {
      payerName: string;
      payerPhone?: string;
      payerEmail?: string;
      amount: number;
      paymentMethod: "CASH" | "TRANSFER" | "CARD";
      proofImageUrl: string;
    }
  ) {
    const form = await this.getEnrollmentPaymentForm(formId);

    if (form.status !== "ACTIVE") {
      throw new Error("Formulario no está disponible para recibir comprobantes");
    }

    // Crear comprobante en la tabla EnrollmentPaymentProof
    const paymentProof = await prisma.enrollmentPaymentProof.create({
      data: {
        formId: form.id,
        payerName: data.payerName,
        payerPhone: data.payerPhone,
        payerEmail: data.payerEmail,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        proofImageUrl: data.proofImageUrl,
        status: "PENDING",
        uploadedAt: new Date(),
        paymentType: "ENROLLMENT",
        concept: `Inscripción ${form.enrollmentPayment.sport === 'DANCE' ? 'Baile' : 'Voleibol'}`,
      },
    });

    // Actualizar formulario como usado
    await prisma.enrollmentPaymentForm.update({
      where: { id: formId },
      data: {
        status: "USED",
        usedAt: new Date(),
      },
    });

    // Actualizar pago de inscripción
    await prisma.enrollmentPayment.update({
      where: { id: form.enrollmentPaymentId },
      data: { status: "PENDING_REVIEW" },
    });

    console.log(`✅ Comprobante de pago de inscripción subido: ${paymentProof.id}`);

    return paymentProof;
  }

  // ========== REVISIÓN DE COMPROBANTES ==========

  /**
   * Revisa un comprobante de pago de inscripción
   */
  async reviewEnrollmentPaymentProof(
    proofId: number,
    data: {
      status: "APPROVED" | "REJECTED";
      approvedAmount?: number;
      reviewedBy: string;
      reviewNotes?: string;
    }
  ) {
    try {
      const proof = await prisma.enrollmentPaymentProof.findUnique({
        where: { id: proofId },
        include: {
          paymentForm: {
            include: {
              student: true,
              period: true,
              monthlyPayment: true
            }
          },
          enrollmentPaymentForm: {
            include: {
              student: true,
              enrollmentPayment: true
            }
          }
        }
      });

      if (!proof) {
        throw new Error('Comprobante no encontrado');
      }

      // Actualizar comprobante
      await prisma.enrollmentPaymentProof.update({
        where: { id: proofId },
        data: {
          status: data.status,
          reviewedAt: new Date(),
          reviewedBy: data.reviewedBy,
          reviewNotes: data.reviewNotes,
        },
      });

      if (data.status === "APPROVED") {
        await this.processApprovedEnrollmentPayment(proof, data);
      } else {
        await this.processRejectedEnrollmentPayment(proof, data);
      }

      // Enviar notificación de WhatsApp
      await this.sendEnrollmentPaymentNotification(proof, data);

      console.log(`✅ Comprobante de inscripción ${data.status.toLowerCase()}: ${proofId}`);

      return { success: true };
    } catch (error) {
      console.error('❌ Error revisando comprobante de inscripción:', error);
      throw error;
    }
  }

  /**
   * Procesa un pago de inscripción aprobado
   */
  private async processApprovedEnrollmentPayment(proof: any, data: any) {
    const paidAmount = data.approvedAmount || proof.amount;
    const enrollmentPayment = proof.enrollmentPaymentForm?.enrollmentPayment;
    const student = proof.enrollmentPaymentForm?.student || proof.paymentForm?.student;

    console.log(`💰 Procesando pago de inscripción: $${paidAmount.toLocaleString()}`);

    // Actualizar el pago de inscripción
    await prisma.enrollmentPayment.update({
      where: { id: enrollmentPayment.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
    });

    // Generar recibo digital
    await this.generateEnrollmentDigitalReceipt(enrollmentPayment.id, paidAmount, proof.paymentMethod, data.reviewedBy);

    console.log(`✅ Pago de inscripción procesado exitosamente`);
  }

  /**
   * Procesa un pago de inscripción rechazado
   */
  private async processRejectedEnrollmentPayment(proof: any, data: any) {
    const enrollmentPayment = proof.enrollmentPaymentForm?.enrollmentPayment;

    // Reactivar el formulario para que pueda subir otro comprobante
    await prisma.enrollmentPaymentForm.update({
      where: { id: proof.formId },
      data: {
        status: "ACTIVE",
        usedAt: null,
      },
    });

    // Actualizar el pago de inscripción
    await prisma.enrollmentPayment.update({
      where: { id: enrollmentPayment.id },
      data: {
        status: "PENDING",
      },
    });

    console.log(`❌ Pago de inscripción rechazado, formulario reactivado`);
  }

  // ========== RECIBOS DIGITALES ==========

  /**
   * Genera recibo digital para pago de inscripción
   */
  private async generateEnrollmentDigitalReceipt(
    enrollmentPaymentId: number,
    approvedAmount: number,
    paymentMethod: string,
    reviewedBy: string
  ) {
    try {
      const enrollmentPayment = await prisma.enrollmentPayment.findUnique({
        where: { id: enrollmentPaymentId },
        include: {
          student: true
        }
      });

      if (!enrollmentPayment) {
        throw new Error('Pago de inscripción no encontrado');
      }

      // Crear recibo en la base de datos
      const receipt = await prisma.receipt.create({
        data: {
          studentId: enrollmentPayment.studentId,
          amount: approvedAmount,
          concept: `Inscripción ${enrollmentPayment.sport}`,
          paymentMethod: this.mapPaymentMethod(paymentMethod),
          notes: `Pago de inscripción aprobado por ${reviewedBy}`,
          whatsappSent: false,
        }
      });

      console.log(`✅ Recibo digital de inscripción creado: ${receipt.id}`);

      return receipt;
    } catch (error) {
      console.error('❌ Error generando recibo digital de inscripción:', error);
    }
  }

  // ========== WHATSAPP ==========

  /**
   * Envía notificación de WhatsApp para pago de inscripción
   */
  async sendEnrollmentPaymentWhatsApp(studentId: string) {
    try {
      const enrollmentPayment = await prisma.enrollmentPayment.findUnique({
        where: { studentId },
        include: {
          student: true
        }
      });

      if (!enrollmentPayment) {
        throw new Error('Pago de inscripción no encontrado');
      }

      const form = await this.generateEnrollmentPaymentForm(studentId);
      const contactPhone = this.getContactPhone(enrollmentPayment.sport);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const paymentLink = `${baseUrl}/enrollment-payment/${form.id}`;

      const whatsappData = {
        studentName: enrollmentPayment.student.name,
        parentPhone: enrollmentPayment.student.phone,
        sport: enrollmentPayment.sport === 'DANCE' ? 'Baile' : 'Voleibol',
        concept: `Inscripción ${enrollmentPayment.sport === 'DANCE' ? 'Baile' : 'Voleibol'}`,
        amount: enrollmentPayment.expectedAmount,
        paymentUrl: paymentLink,
        contactPhone: contactPhone
      };

      const result = await whatsappService.sendEnrollmentTemplate(whatsappData);
      
      console.log(`✅ WhatsApp de inscripción enviado a ${enrollmentPayment.student.name}`);
      
      return result;
    } catch (error) {
      console.error('❌ Error enviando WhatsApp de inscripción:', error);
      throw error;
    }
  }

  /**
   * Envía notificaciones de WhatsApp según el estado del comprobante
   */
  private async sendEnrollmentPaymentNotification(proof: any, data: any) {
    try {
      const student = proof.enrollmentPaymentForm?.student || proof.paymentForm?.student;
      const enrollmentPayment = proof.enrollmentPaymentForm?.enrollmentPayment;

      if (!student?.phone) {
        console.log("⚠️ Estudiante sin teléfono configurado, notificación no enviada");
        return;
      }

      const paymentMethodLabels = {
        TRANSFER: "Transferencia",
        CASH: "Efectivo",
        CARD: "Tarjeta",
      };

      if (data.status === "APPROVED") {
        await this.sendApprovedEnrollmentNotification(student, enrollmentPayment, proof, paymentMethodLabels, data.approvedAmount || proof.amount);
      } else if (data.status === "REJECTED") {
        await this.sendRejectedEnrollmentNotification(student, enrollmentPayment, proof, paymentMethodLabels, data.reviewNotes);
      }
    } catch (whatsappError) {
      console.error("❌ Error enviando notificación de WhatsApp de inscripción:", whatsappError);
    }
  }

  /**
   * Envía notificación de pago aprobado
   */
  private async sendApprovedEnrollmentNotification(student: any, enrollmentPayment: any, proof: any, paymentMethodLabels: any, approvedAmount: number) {
    const message = `✅ *Inscripción Aprobada*

¡Hola ${student.name}! Tu inscripción ha sido aprobada exitosamente.

📋 *Detalles del pago:*
• Deporte: ${enrollmentPayment.sport}
• Monto pagado: $${approvedAmount.toLocaleString()}
• Método: ${paymentMethodLabels[proof.paymentMethod]}
• Fecha: ${new Date().toLocaleDateString('es-ES')}

🎉 *¡Bienvenido a Paradise!*

Tu inscripción está completa y puedes comenzar a entrenar.

¿Tienes alguna pregunta? ¡No dudes en contactarnos!

*Paradise Dance Academy* ✨`;

    // Usar el método de texto directo para notificaciones
    await whatsappService.sendPaymentMessageText({
      studentName: student.name,
      parentPhone: student.phone,
      paymentLink: '',
      amount: approvedAmount,
      period: `Inscripción ${enrollmentPayment.sport}`,
      dueDate: new Date().toLocaleDateString('es-ES')
    });
  }

  /**
   * Envía notificación de pago rechazado
   */
  private async sendRejectedEnrollmentNotification(student: any, enrollmentPayment: any, proof: any, paymentMethodLabels: any, reviewNotes: string) {
    const message = `❌ *Inscripción Requiere Revisión*

¡Hola ${student.name}! Tu comprobante de inscripción requiere revisión.

📋 *Detalles:*
• Deporte: ${enrollmentPayment.sport}
• Monto: $${proof.amount.toLocaleString()}
• Motivo: ${reviewNotes || 'Comprobante no válido'}

🔄 *Próximos pasos:*
1. Revisa el comprobante subido
2. Asegúrate de que sea claro y legible
3. Sube un nuevo comprobante si es necesario

¿Necesitas ayuda? ¡Contáctanos!

*Paradise Dance Academy* ✨`;

    // Usar el método de texto directo para notificaciones
    await whatsappService.sendPaymentMessageText({
      studentName: student.name,
      parentPhone: student.phone,
      paymentLink: '',
      amount: proof.amount,
      period: `Inscripción ${enrollmentPayment.sport}`,
      dueDate: new Date().toLocaleDateString('es-ES')
    });
  }

  // ========== UTILIDADES ==========

  /**
   * Mapea el método de pago
   */
  private mapPaymentMethod(method: string): "CASH" | "TRANSFER" | "CARD" {
    switch (method.toUpperCase()) {
      case "CASH":
        return "CASH";
      case "TRANSFER":
        return "TRANSFER";
      case "CARD":
        return "CARD";
      default:
        return "TRANSFER";
    }
  }

  /**
   * Obtiene información de pago de inscripción de un estudiante
   */
  async getStudentEnrollmentPaymentInfo(studentId: string) {
    const enrollmentPayment = await prisma.enrollmentPayment.findUnique({
      where: { studentId },
      include: {
        student: true,
        paymentForms: {
          include: {
            paymentProofs: {
              orderBy: { createdAt: 'desc' }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!enrollmentPayment) {
      return null;
    }

    return {
      enrollmentPayment,
      hasActiveForm: enrollmentPayment.paymentForms.some(form => form.status === 'ACTIVE'),
      latestProof: enrollmentPayment.paymentForms[0]?.paymentProofs[0] || null
    };
  }
}

export const enrollmentPaymentService = new EnrollmentPaymentService(); 