import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { EnrollmentPaymentService } from '@/lib/enrollment-payment-service'
import { WhatsAppService } from '@/lib/whatsapp-service'
import { formatPhoneForStorage } from '@/lib/phone-utils'

// Función para capitalizar nombres (primera letra de cada palabra en mayúscula)
function capitalizeName(name: string): string {
  if (!name || typeof name !== 'string') return ''
  
  return name
    .toLowerCase()
    .trim()
    .split(' ')
    .filter(word => word.length > 0) // Filtrar espacios vacíos
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

const enrollmentPaymentService = new EnrollmentPaymentService()

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Log para debugging - ver qué datos están llegando
    console.log('📋 Datos recibidos en enrollment/register:', JSON.stringify(data, null, 2))
    


    // Validar datos requeridos
    if (!data.studentName || !data.documentNumber || !data.phone) {
      console.log('❌ Faltan datos requeridos:', {
        studentName: !!data.studentName,
        documentNumber: !!data.documentNumber,
        phone: !!data.phone
      })
      return NextResponse.json({
        success: false,
        error: 'Faltan datos requeridos'
      }, { status: 400 })
    }

    // Validar formato de teléfono
    const cleanPhone = data.phone.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      return NextResponse.json({
        success: false,
        error: 'El número de teléfono debe tener exactamente 10 dígitos'
      }, { status: 400 })
    }

    // Validar que documentNumber sea un número válido (solo dígitos, no vacío)
    const documentNumberStr = String(data.documentNumber).trim()
    if (!/^[0-9]+$/.test(documentNumberStr) || documentNumberStr.length === 0) {
      console.log('❌ Número de documento inválido:', data.documentNumber)
      return NextResponse.json({
        success: false,
        error: 'El número de documento debe ser un número válido'
      }, { status: 400 })
    }

    // Validar nombre completo (solo letras y espacios, mínimo 2 caracteres)
    const fullName = String(data.studentName || '').trim()
    if (!/^[A-Za-z ]{2,}$/.test(fullName)) {
      return NextResponse.json({
        success: false,
        error: 'El nombre solo puede contener letras y espacios'
      }, { status: 400 })
    }

    // Capitalizar nombre del estudiante
    const capitalizedStudentName = capitalizeName(fullName)

    // Validar email
    const email = String(data.email || '').trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'El correo no es válido'
      }, { status: 400 })
    }

    // Validar fecha de nacimiento no futura (si viene)
    if (data.birthDate) {
      const birth = new Date(data.birthDate)
      const today = new Date()
      birth.setHours(0,0,0,0)
      today.setHours(0,0,0,0)
      if (isNaN(birth.getTime()) || birth > today) {
        return NextResponse.json({
          success: false,
          error: 'La fecha de nacimiento no puede ser futura'
        }, { status: 400 })
      }
    }

    // Validar contacto de emergencia
    let capitalizedEmergencyName = null
    if (data.emergencyContactName) {
      const emergencyName = String(data.emergencyContactName).trim()
      if (!/^[A-Za-z ]{2,}$/.test(emergencyName)) {
        return NextResponse.json({
          success: false,
          error: 'El nombre del contacto de emergencia solo puede contener letras y espacios'
        }, { status: 400 })
      }
      capitalizedEmergencyName = capitalizeName(emergencyName)
    }

    // Validar teléfono de emergencia
    if (data.emergencyContactPhone) {
      const emergencyPhone = data.emergencyContactPhone.replace(/\D/g, '')
      if (emergencyPhone.length !== 10) {
        return NextResponse.json({
          success: false,
          error: 'El teléfono del contacto de emergencia debe tener exactamente 10 dígitos'
        }, { status: 400 })
      }
    }

    // Validar acudiente (si es menor de edad)
    let capitalizedGuardianName = null
    if (!data.isAdult) {
      if (data.guardianName) {
        const guardianName = String(data.guardianName).trim()
        if (!/^[A-Za-z ]{2,}$/.test(guardianName)) {
          return NextResponse.json({
            success: false,
            error: 'El nombre del acudiente solo puede contener letras y espacios'
          }, { status: 400 })
        }
        capitalizedGuardianName = capitalizeName(guardianName)
      }

      if (data.guardianPhone) {
        const guardianPhone = data.guardianPhone.replace(/\D/g, '')
        if (guardianPhone.length !== 10) {
          return NextResponse.json({
            success: false,
            error: 'El teléfono del acudiente debe tener exactamente 10 dígitos'
          }, { status: 400 })
        }
      }
    }

    console.log('🔍 Buscando estudiante con ID:', documentNumberStr)

    // Buscar o crear usuario (User) asociado al estudiante
    let user = null;
    if (!data.email) {
      return NextResponse.json({
        success: false,
        error: 'El email es requerido para el registro'
      }, { status: 400 });
    }

    // Buscar usuario existente por email
    user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      // Hashear la contraseña antes de guardar
      const hashedPassword = await bcrypt.hash(documentNumberStr, 10);
      user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          role: 'STUDENT',
          isActive: true
        }
      });
      console.log('✅ Usuario creado:', user.id);
    } else {
      console.log('👤 Usuario ya existe:', user.id);
    }

    // Verificar si el estudiante ya existe
    let student = await prisma.student.findUnique({
      where: { id: documentNumberStr }
    });

    console.log('👤 Resultado búsqueda estudiante:', student ? 'Encontrado' : 'No encontrado');

    // Si no existe, crear el estudiante y asociar userId
    if (!student) {
      console.log('🆕 Creando nuevo estudiante...');
      try {
        student = await prisma.student.create({
          data: {
            id: documentNumberStr,
            name: capitalizedStudentName,
            phone: formatPhoneForStorage(data.phone),
            avatar: data.profilePhotoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(capitalizedStudentName)}`,
            userId: user.id
          }
        });

        console.log('✅ Estudiante creado exitosamente:', student.id);

        // Crear información extendida de inscripción con todos los datos
        console.log('📝 Creando datos extendidos de inscripción...');
        await prisma.studentEnrollmentData.create({
          data: {
            studentId: student.id,
            documentType: data.documentType || null,
            birthDate: data.birthDate || null,
            address: data.address || null,
            addressLatitude: data.addressLatitude || null,
            addressLongitude: data.addressLongitude || null,
            neighborhood: data.neighborhood || null,
            city: data.city || null,
            hasSisben: data.hasSisben || false,
            eps: data.eps || null,
            bloodType: data.bloodType || null,
            hasRestrictions: data.hasRestrictions || false,
            restrictionsDescription: data.restrictionsDescription || null,
            medicalConditions: data.medicalConditions || null,
            isAdult: data.isAdult !== undefined ? data.isAdult : true,
            emergencyContactName: capitalizedEmergencyName,
            emergencyContactRelation: data.emergencyContactRelation || null,
            emergencyContactPhone: data.emergencyContactPhone ? formatPhoneForStorage(data.emergencyContactPhone) : null,
            guardianName: capitalizedGuardianName,
            guardianRelation: data.guardianRelation || null,
            guardianPhone: data.guardianPhone ? formatPhoneForStorage(data.guardianPhone) : null,
            monthlyFee: null, // Se definirá por la administración
            jerseyNumber: data.jerseyNumber || null
          }
        });

        console.log('✅ Datos extendidos creados exitosamente');

      } catch (createError: unknown) {
        console.error('❌ Error creando estudiante:', createError);
        // Verificar si es error de duplicado
        if (createError && typeof createError === 'object' && 'code' in createError && createError.code === 'P2002') {
          return NextResponse.json({
            success: false,
            error: 'Ya existe un estudiante con este número de documento, email o teléfono'
          }, { status: 400 });
        }
        throw createError;
      }
    } else {
      console.log('👤 Estudiante ya existe, actualizando información extendida si es necesario...');
    }

    // Verificar que student existe antes de continuar
    if (!student) {
      console.error('❌ Error: student es null después de la creación')
      return NextResponse.json({
        success: false,
        error: 'Error interno: no se pudo crear o encontrar el estudiante'
      }, { status: 500 })
    }

    // Crear la inscripción si se proporcionó classId
    let enrollment = null
    if (data.classId) {
      console.log('📚 Creando inscripción a clase:', data.classId)
      
      try {
        enrollment = await prisma.classEnrollment.create({
          data: {
            studentId: student.id,
            classId: parseInt(data.classId)
          }
        })
        
        console.log('✅ Inscripción creada exitosamente:', enrollment.id)
        
      } catch (error: unknown) {
        // Si ya está inscrito, no es un error
        console.log('⚠️ Posible inscripción duplicada (ignorando):', error)
      }
    } else {
      console.log('⚠️ No se proporcionó classId, no se crea inscripción a clase')
    }

    // ===== CREAR PAGO DE INSCRIPCIÓN AUTOMÁTICAMENTE =====
    console.log('💰 Creando pago de inscripción automáticamente...');
    let enrollmentPayment = null;
    let paymentForm = null;
    
    try {
      // Crear el pago de inscripción
      enrollmentPayment = await enrollmentPaymentService.createEnrollmentPayment(
        student.id, 
        data.sport as 'DANCE' | 'VOLLEYBALL'
      );
      
      console.log('✅ Pago de inscripción creado:', enrollmentPayment.id);
      
      // Crear formulario de pago
      paymentForm = await enrollmentPaymentService.generateEnrollmentPaymentForm(student.id);
      
      console.log('✅ Formulario de pago creado:', paymentForm.id);
      
      // ===== ENVIAR WHATSAPP AUTOMÁTICAMENTE =====
      // TEMPORALMENTE DESHABILITADO - Para reactivar, descomenta las líneas siguientes
      /*
      console.log('📱 Enviando WhatsApp automático...');
      
      const whatsappService = new WhatsAppService();
      const paymentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${paymentForm.url}`;
      
      // Determinar número de contacto según deporte
      const contactPhone = data.sport === 'VOLLEYBALL' ? '3128984535' : '3205656520';
      
      const whatsappData = {
        parentPhone: student.phone,
        studentName: capitalizedStudentName,
        sport: data.sport === 'DANCE' ? 'Baile' : 'Voleibol',
        concept: `Inscripción ${data.sport === 'DANCE' ? 'Baile' : 'Voleibol'}`,
        amount: enrollmentPayment.expectedAmount,
        paymentUrl: paymentUrl,
        contactPhone: contactPhone
      };
      
      const whatsappResult = await whatsappService.sendEnrollmentTemplate(whatsappData);
      
      if (whatsappResult.success) {
        console.log('✅ WhatsApp enviado exitosamente');
      } else {
        console.log('⚠️ Error enviando WhatsApp:', whatsappResult.error);
      }
      */
      
      // Mensaje temporal mientras WhatsApp está deshabilitado
      console.log('📱 WhatsApp temporalmente deshabilitado');
      
    } catch (error) {
      console.error('❌ Error en proceso de pago/WhatsApp:', error);
      // No fallamos la inscripción si hay error en el pago
    }
    
    console.log('🎉 Proceso completado exitosamente')
    
    return NextResponse.json({
      success: true,
      message: 'Inscripción procesada exitosamente',
      student: {
        id: student.id,
        name: capitalizedStudentName,
        phone: student.phone
      },
      enrollment: enrollment ? {
        id: enrollment.id,
        classId: enrollment.classId
      } : null
    })

  } catch (error: any) {
    console.error('💥 Error processing enrollment:', error)
    console.error('💥 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      code: error.code || 'No error code'
    })
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
} 