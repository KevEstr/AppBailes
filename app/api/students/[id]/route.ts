import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const studentId = parseInt(id)

    if (isNaN(studentId)) {
      return NextResponse.json(
        { error: 'ID de estudiante inválido' },
        { status: 400 }
      )
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollmentData: true,
        debts: {
          where: { isPaid: false },
          orderBy: { dueDate: 'asc' }
        },
        receipts: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      student
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
    const studentId = parseInt(id)

    console.log('PUT Request - Student ID:', id, 'Parsed:', studentId)

    if (isNaN(studentId)) {
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
        email: data.email || null,
        phone: data.phone
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
        emergencyContactPhone: data.emergencyContactPhone || null,
        guardianName: data.guardianName || null,
        guardianRelation: data.guardianRelation || null,
        guardianPhone: data.guardianPhone || null,
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
        emergencyContactPhone: data.emergencyContactPhone || null,
        guardianName: data.guardianName || null,
        guardianRelation: data.guardianRelation || null,
        guardianPhone: data.guardianPhone || null,
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