import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { whatsappService } from '@/lib/whatsapp-service';
import { monthlyPaymentService } from '@/lib/monthly-payment-service';

// POST /api/admin/scheduled-whatsapp/execute - Ejecutar envíos programados
export async function POST(request: NextRequest) {
  try {
    const now = new Date();
    
    console.log('🕐 Verificando envíos programados...', now.toISOString());

    // Obtener envíos programados que deben ejecutarse
    const scheduledSends = await prisma.scheduledWhatsAppSend.findMany({
      where: {
        status: 'PENDING',
        scheduledDate: {
          lte: now
        }
      },
      include: {
        period: true
      }
    });

    if (scheduledSends.length === 0) {
      console.log('📝 No hay envíos programados para ejecutar');
      return NextResponse.json({
        message: 'No hay envíos programados para ejecutar',
        processed: 0
      });
    }

    const results = [];

    for (const scheduledSend of scheduledSends) {
      console.log(`🚀 Ejecutando envío programado: ${scheduledSend.name}`);
      
      try {
        // Marcar como en ejecución
        await prisma.scheduledWhatsAppSend.update({
          where: { id: scheduledSend.id },
          data: {
            status: 'RUNNING',
            startedAt: now
          }
        });

        // Obtener formularios de pago del período
        const paymentForms = await monthlyPaymentService.getPaymentFormsByPeriod(scheduledSend.periodId);
        
        if (!paymentForms || paymentForms.length === 0) {
          await prisma.scheduledWhatsAppSend.update({
            where: { id: scheduledSend.id },
            data: {
              status: 'FAILED',
              completedAt: new Date()
            }
          });
          continue;
        }

        // Filtrar solo formularios de estudiantes con teléfono
        const formsWithPhone = paymentForms.filter((form: any) => 
          form.student.phone && form.student.phone.trim() !== ''
        );

        let sentCount = 0;
        let failedCount = 0;
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        // Enviar mensajes con intervalo
        for (let i = 0; i < formsWithPhone.length; i++) {
          const form = formsWithPhone[i];
          
          try {
            const paymentLink = `${baseUrl}/payment/${form.id}`;
            const dueDate = new Date(form.period.dueDate).toLocaleDateString('es-ES');

            const whatsappData = {
              studentName: form.student.name,
              parentPhone: form.student.phone,
              paymentLink: paymentLink,
              amount: form.amount,
              period: form.period.name,
              dueDate: dueDate
            };

            console.log(`📱 Enviando WhatsApp ${i + 1}/${formsWithPhone.length} a ${form.student.name}`);
            
            // Enviar mensaje
            await whatsappService.sendPaymentMessage(whatsappData);
            sentCount++;

            // Actualizar progreso en base de datos
            await prisma.scheduledWhatsAppSend.update({
              where: { id: scheduledSend.id },
              data: {
                sentMessages: sentCount,
                failedMessages: failedCount
              }
            });

            // Intervalo entre mensajes (solo si no es el último)
            if (i < formsWithPhone.length - 1) {
              console.log(`⏳ Esperando ${scheduledSend.intervalMinutes} minutos...`);
              await new Promise(resolve => 
                setTimeout(resolve, scheduledSend.intervalMinutes * 60 * 1000)
              );
            }

          } catch (error) {
            console.error(`❌ Error enviando a ${form.student.name}:`, error);
            failedCount++;
            
            // Actualizar progreso en base de datos
            await prisma.scheduledWhatsAppSend.update({
              where: { id: scheduledSend.id },
              data: {
                sentMessages: sentCount,
                failedMessages: failedCount
              }
            });
          }
        }

        // Marcar como completado
        await prisma.scheduledWhatsAppSend.update({
          where: { id: scheduledSend.id },
          data: {
            status: 'COMPLETED',
            sentMessages: sentCount,
            failedMessages: failedCount,
            completedAt: new Date()
          }
        });

        console.log(`✅ Envío completado: ${sentCount} enviados, ${failedCount} fallidos`);

        results.push({
          id: scheduledSend.id,
          name: scheduledSend.name,
          sent: sentCount,
          failed: failedCount,
          total: formsWithPhone.length
        });

      } catch (error) {
        console.error(`💥 Error en envío programado ${scheduledSend.name}:`, error);
        
        // Marcar como fallido
        await prisma.scheduledWhatsAppSend.update({
          where: { id: scheduledSend.id },
          data: {
            status: 'FAILED',
            completedAt: new Date()
          }
        });

        results.push({
          id: scheduledSend.id,
          name: scheduledSend.name,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    console.log('🏁 Ejecución de envíos programados completada');

    return NextResponse.json({
      message: 'Envíos programados procesados',
      processed: scheduledSends.length,
      results
    });

  } catch (error) {
    console.error('💥 Error ejecutando envíos programados:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET /api/admin/scheduled-whatsapp/execute - Ejecutar manualmente (para testing)
export async function GET() {
  // Redirigir al POST para testing manual
  return POST(new NextRequest('http://localhost:3000/api/admin/scheduled-whatsapp/execute', {
    method: 'POST'
  }));
} 