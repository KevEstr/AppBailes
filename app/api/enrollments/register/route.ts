import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs';
import { EnrollmentPaymentService } from '@/lib/enrollment-payment-service';

const enrollmentPaymentService = new EnrollmentPaymentService();

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

    // Validar que documentNumber sea un número válido (solo dígitos, no vacío)
    const documentNumberStr = String(data.documentNumber).trim()
    if (!/^[0-9]+$/.test(documentNumberStr) || documentNumberStr.length === 0) {
      console.log('❌ Número de documento inválido:', data.documentNumber)
      return NextResponse.json({
        success: false,
        error: 'El número de documento debe ser un número válido'
      }, { status: 400 })
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
            name: data.studentName,
            phone: data.phone,
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.studentName)}`,
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
            city: 'Itagüí',
            hasSisben: data.hasSisben || false,
            eps: data.eps || null,
            bloodType: data.bloodType || null,
            hasRestrictions: data.hasRestrictions || false,
            restrictionsDescription: data.restrictionsDescription || null,
            medicalConditions: data.medicalConditions || null,
            isAdult: data.isAdult !== undefined ? data.isAdult : true,
            emergencyContactName: data.emergencyContactName || null,
            emergencyContactRelation: data.emergencyContactRelation || null,
            emergencyContactPhone: data.emergencyContactPhone || null,
            guardianName: data.guardianName || null,
            guardianRelation: data.guardianRelation || null,
            guardianPhone: data.guardianPhone || null,
            monthlyFee: null // Se definirá por la administración
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
    let sport: 'DANCE' | 'VOLLEYBALL' = 'DANCE'; // Por defecto
    
    if (data.classId) {
      console.log('📚 Creando inscripción a clase:', data.classId)
      
      try {
        // Obtener información de la clase para determinar el deporte
        const danceClass = await prisma.danceClass.findUnique({
          where: { id: parseInt(data.classId) },
          select: { sport: true }
        });
        
        if (danceClass) {
          sport = danceClass.sport as 'DANCE' | 'VOLLEYBALL';
          console.log(`🏃 Deporte detectado: ${sport}`);
        }
        
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

    // Crear pago de inscripción automáticamente
    let enrollmentPayment = null;
    try {
      console.log('💰 Creando pago de inscripción automáticamente...');
      enrollmentPayment = await enrollmentPaymentService.createEnrollmentPaymentAndNotify(student.id, sport);
      console.log('✅ Pago de inscripción creado y WhatsApp enviado');
    } catch (paymentError) {
      console.error('❌ Error creando pago de inscripción:', paymentError);
      // No fallar el proceso completo si hay error en el pago
    }
    
    console.log('🎉 Proceso completado exitosamente')
    
    return NextResponse.json({
      success: true,
      message: 'Inscripción procesada exitosamente',
      student: {
        id: student.id,
        name: student.name,
        phone: student.phone
      },
      enrollment: enrollment ? {
        id: enrollment.id,
        classId: enrollment.classId
      } : null,
      enrollmentPayment: enrollmentPayment ? {
        id: enrollmentPayment.id,
        amount: enrollmentPayment.expectedAmount,
        sport: enrollmentPayment.sport
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