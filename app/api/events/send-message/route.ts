import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppService } from "@/lib/whatsapp-service";
import { prisma } from "@/lib/prisma";

interface SendEventMessageRequest {
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  eventDescription?: string;
  additionalInfo?: string;
  classIds: number[];
}

export async function POST(request: NextRequest) {
  try {
    const body: SendEventMessageRequest = await request.json();
    
    console.log('🎉 Iniciando envío de mensajes de evento:', body);

    // Validar datos requeridos
    if (!body.eventName || !body.eventDate || !body.eventTime || !body.eventLocation || !body.classIds?.length) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Faltan datos requeridos: nombre, fecha, hora, lugar del evento y clases seleccionadas" 
        },
        { status: 400 }
      );
    }

    // Obtener estudiantes de las clases seleccionadas
    const enrollments = await prisma.classEnrollment.findMany({
      where: {
        classId: {
          in: body.classIds
        },
        isActive: true
      },
      include: {
        student: {
          include: {
            user: true
          }
        },
        danceClass: {
          select: {
            name: true,
            sport: true
          }
        }
      }
    });

    console.log(`📚 Encontrados ${enrollments.length} estudiantes en las clases seleccionadas`);

    if (enrollments.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No se encontraron estudiantes activos en las clases seleccionadas" 
        },
        { status: 404 }
      );
    }

    // Agrupar estudiantes por teléfono para evitar duplicados
    const studentsByPhone = new Map<string, any>();
    
    enrollments.forEach(enrollment => {
      const phone = enrollment.student.phone;
      if (!studentsByPhone.has(phone)) {
        studentsByPhone.set(phone, {
          studentName: enrollment.student.name,
          parentPhone: phone,
          classes: []
        });
      }
      studentsByPhone.get(phone).classes.push({
        name: enrollment.danceClass.name,
        sport: enrollment.danceClass.sport
      });
    });

    console.log(`📱 Se enviarán mensajes a ${studentsByPhone.size} números únicos`);

    const whatsappService = getWhatsAppService();
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Enviar mensaje a cada estudiante
    for (const [phone, studentData] of studentsByPhone) {
      try {
        console.log(`📤 Enviando mensaje a ${studentData.studentName} (${phone})`);
        
        const eventMessage = {
          studentName: studentData.studentName,
          parentPhone: phone,
          eventName: body.eventName,
          eventDate: body.eventDate,
          eventTime: body.eventTime,
          eventLocation: body.eventLocation,
          eventDescription: body.eventDescription,
          additionalInfo: body.additionalInfo
        };

        const response = await whatsappService.sendEventMessage(eventMessage);
        
        results.push({
          studentName: studentData.studentName,
          phone: phone,
          success: true,
          messageId: response.messages?.[0]?.id,
          classes: studentData.classes
        });
        
        successCount++;
        console.log(`✅ Mensaje enviado exitosamente a ${studentData.studentName}`);
        
        // Pequeña pausa entre mensajes para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error enviando mensaje a ${studentData.studentName}:`, error);
        
        results.push({
          studentName: studentData.studentName,
          phone: phone,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido',
          classes: studentData.classes
        });
        
        errorCount++;
      }
    }

    console.log(`📊 Resumen del envío:`);
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📱 Total números: ${studentsByPhone.size}`);

    return NextResponse.json({
      success: true,
      message: `Mensajes de evento enviados: ${successCount} exitosos, ${errorCount} errores`,
      summary: {
        totalStudents: studentsByPhone.size,
        successCount,
        errorCount,
        eventName: body.eventName,
        eventDate: body.eventDate,
        eventTime: body.eventTime,
        eventLocation: body.eventLocation
      },
      results
    });

  } catch (error) {
    console.error('💥 Error en envío de mensajes de evento:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}
