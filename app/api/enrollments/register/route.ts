import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    // Validar datos requeridos
    if (!data.studentName || !data.documentNumber || !data.phone) {
      return NextResponse.json({
        success: false,
        error: 'Faltan datos requeridos'
      }, { status: 400 })
    }

    // Verificar si el estudiante ya existe
    let student = await prisma.student.findUnique({
      where: { id: parseInt(data.documentNumber) }
    })

    // Si no existe, crear el estudiante
    if (!student) {
      student = await prisma.student.create({
        data: {
          id: parseInt(data.documentNumber),
          name: data.studentName,
          phone: data.phone,
          email: data.email || null,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(data.studentName)}`
        }
      })

      // Crear información extendida de inscripción con todos los datos
      await prisma.studentEnrollmentData.create({
        data: {
          studentId: student.id,
          documentType: data.documentType || null,
          birthDate: data.birthDate || null,
          address: data.address || null,
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
      })
    }

    // Crear la inscripción si se proporcionó classId
    let enrollment = null
    if (data.classId) {
      try {
        enrollment = await prisma.classEnrollment.create({
          data: {
            studentId: student.id,
            classId: parseInt(data.classId)
          }
        })
      } catch (error) {
        // Si ya está inscrito, no es un error
        console.log('Student might already be enrolled:', error)
      }
    }

    // Guardar información adicional en una tabla de registros de inscripción
    // Por ahora, solo retornamos éxito
    
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
      } : null
    })

  } catch (error) {
    console.error('Error processing enrollment:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
} 