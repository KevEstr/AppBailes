import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatPhoneForDisplay, formatPhoneForStorage } from '@/lib/phone-utils'
import { toZonedTime } from 'date-fns-tz'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = id.trim() // Cédula como string

    if (!studentId || studentId.length === 0) {
      return NextResponse.json(
        { error: 'ID de estudiante inválido' },
        { status: 400 }
      )
    }

    const today = new Date()

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        enrollmentData: true,
        monthlyPayments: {
          where: { 
            status: { in: ['PENDING', 'OVERDUE'] },
            dueDate: {
              lt: today, // Pagos vencidos (dueDate < hoy)
              not: null // Solo los que tienen fecha de vencimiento
            }
          },
          include: {
            period: {
              select: {
                name: true
              }
            },
            danceClass: {
              select: {
                name: true
              }
            }
          },
          orderBy: { dueDate: 'asc' }
        },
        receipts: {
          where: {
            createdAt: {
              gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      )
    }

    // Transformar pagos vencidos al formato esperado por el modal
    const TZ = 'America/Bogota';
    const overdueDebts = student.monthlyPayments.map(payment => {
      // Formatear la fecha preservando la zona horaria de Colombia (-05:00)
      // Convertir a zona horaria de Colombia antes de extraer componentes
      let dueDateStr = '';
      if (payment.dueDate) {
        const zoned = toZonedTime(payment.dueDate, TZ);
        const year = zoned.getFullYear();
        const month = String(zoned.getMonth() + 1).padStart(2, '0');
        const day = String(zoned.getDate()).padStart(2, '0');
        const hours = String(zoned.getHours()).padStart(2, '0');
        const minutes = String(zoned.getMinutes()).padStart(2, '0');
        const seconds = String(zoned.getSeconds()).padStart(2, '0');
        // Mantener la zona horaria de Colombia (-05:00)
        dueDateStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000-05:00`;
      }
      
      return {
        id: payment.id,
        amount: payment.expectedAmount - (payment.paidAmount || 0), // Monto pendiente
        concept: `Mensualidad ${payment.period.name}${payment.danceClass ? ` - ${payment.danceClass.name}` : ''}`,
        dueDate: dueDateStr || new Date().toISOString()
      };
    })

    // Formatear números de teléfono para mostrar sin código de país
    const formattedStudent = {
      ...student,
      phone: formatPhoneForDisplay(student.phone),
      enrollmentData: student.enrollmentData ? {
        ...student.enrollmentData,
        emergencyContactPhone: formatPhoneForDisplay(student.enrollmentData.emergencyContactPhone),
        // Guardian fields removed - using emergency contact instead
      } : null,
      debts: overdueDebts, // Reemplazar con pagos vencidos transformados
      monthlyPayments: undefined // No exponer directamente
    }
    
    // Debug: Log the student data
    console.log('🔍 API: Student data with overdue payments and receipts:', {
      studentId: formattedStudent.id,
      debts: formattedStudent.debts,
      receipts: formattedStudent.receipts,
      debtsLength: formattedStudent.debts?.length || 0,
      receiptsLength: formattedStudent.receipts?.length || 0
    });

    return NextResponse.json({
      success: true,
      student: formattedStudent
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    console.error('Error fetching student:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = id.trim() // Cédula como string

    console.log('PUT Request - Student ID:', id, 'Cleaned:', studentId)

    if (!studentId || studentId.length === 0) {
      console.log('Invalid student ID:', id)
      return NextResponse.json(
        { error: 'ID de estudiante inválido' },
        { status: 400 }
      )
    }

    const data = await request.json()
    console.log('PUT Request - Data received:', JSON.stringify(data, null, 2))

    // Verificar que el estudiante existe
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!existingStudent) {
      console.log('Student not found with ID:', studentId)
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      )
    }

    console.log('Existing student found:', existingStudent)

    // Actualizar información básica del estudiante
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        name: data.name,
        phone: formatPhoneForStorage(data.phone)
      }
    })

    console.log('Student basic info updated successfully')

    // Actualizar o crear información extendida
    const enrollmentData = await prisma.studentEnrollmentData.upsert({
      where: { studentId: studentId },
      update: {
        documentType: data.documentType || null,
        birthDate: data.birthDate || null,
        address: data.address || null,
        addressLatitude: data.addressLatitude || null,
        addressLongitude: data.addressLongitude || null,
        neighborhood: data.neighborhood || null,
        city: data.city || 'Itagüí',
        hasSisben: data.hasSisben || false,
        eps: data.eps || null,
        bloodType: data.bloodType || null,
        hasRestrictions: data.hasRestrictions || false,
        restrictionsDescription: data.restrictionsDescription || null,
        medicalConditions: data.medicalConditions || null,
        isAdult: data.isAdult !== undefined ? data.isAdult : true,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactRelation: data.emergencyContactRelation || null,
        emergencyContactPhone: data.emergencyContactPhone ? formatPhoneForStorage(data.emergencyContactPhone) : null,
        // Guardian fields removed - using emergency contact instead
        monthlyFee: data.monthlyFee || null
      },
      create: {
        studentId: studentId,
        documentType: data.documentType || null,
        birthDate: data.birthDate || null,
        address: data.address || null,
        addressLatitude: data.addressLatitude || null,
        addressLongitude: data.addressLongitude || null,
        neighborhood: data.neighborhood || null,
        city: data.city || 'Itagüí',
        hasSisben: data.hasSisben || false,
        eps: data.eps || null,
        bloodType: data.bloodType || null,
        hasRestrictions: data.hasRestrictions || false,
        restrictionsDescription: data.restrictionsDescription || null,
        medicalConditions: data.medicalConditions || null,
        isAdult: data.isAdult !== undefined ? data.isAdult : true,
        emergencyContactName: data.emergencyContactName || null,
        emergencyContactRelation: data.emergencyContactRelation || null,
        emergencyContactPhone: data.emergencyContactPhone ? formatPhoneForStorage(data.emergencyContactPhone) : null,
        // Guardian fields removed - using emergency contact instead
        monthlyFee: data.monthlyFee || null
      }
    })

    console.log('Enrollment data updated successfully')

    return NextResponse.json({
      success: true,
      student: updatedStudent,
      enrollmentData
    })
  } catch (error) {
    console.error('Error updating student:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 