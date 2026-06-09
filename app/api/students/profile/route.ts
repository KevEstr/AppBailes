import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'
import { prisma } from '@/lib/prisma'
import { formatPhoneForDisplay, formatPhoneForStorage } from '@/lib/phone-utils'

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 API: Getting session...")
    const session = await getServerSession(authOptions)
    
    console.log("🔍 API: Session data:", {
      hasSession: !!session,
      user: session?.user,
      role: session?.user?.role,
      id: session?.user?.id
    })
    
    if (!session || !session.user) {
      console.log("❌ API: No authorizado - no session")
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userRole = session.user.role
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!userId) {
      console.log("❌ API: No user ID válido")
      return NextResponse.json(
        { error: 'ID de usuario no válido' },
        { status: 400 }
      )
    }

    console.log("🔍 API: Searching student...", { userId, userRole, studentId })

    let student;
    
    // Si es admin y proporciona studentId, buscar ese estudiante específico
    if (userRole === 'ADMIN' && studentId) {
      student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          user: { select: { email: true } },
          enrollmentData: true,
          classEnrollments: {
            where: { isActive: true },
            include: {
              danceClass: {
                include: {
                  trainer: {
                    select: {
                      name: true,
                    }
                  },
                  schedules: {
                    orderBy: { dayOfWeek: 'asc' }
                  }
                }
              }
            }
          },
          debts: {
            where: { isPaid: false },
            orderBy: { dueDate: 'asc' },
            take: 5
          },
          receipts: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })
    }
    // Si es admin sin studentId o es estudiante, buscar por userId
    else {
      student = await prisma.student.findFirst({
        where: { userId: parseInt(userId) },
        include: {
          user: { select: { email: true } },
          enrollmentData: true,
          classEnrollments: {
            where: { isActive: true },
            include: {
              danceClass: {
                include: {
                  trainer: {
                    select: {
                      name: true,
                    }
                  },
                  schedules: {
                    orderBy: { dayOfWeek: 'asc' }
                  }
                }
              }
            }
          },
          debts: {
            where: { isPaid: false },
            orderBy: { dueDate: 'asc' },
            take: 5
          },
          receipts: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      })
    }

    console.log("🔍 API: Student found:", !!student)

    if (!student) {
      console.log("❌ API: Student not found")
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      )
    }

    console.log("✅ API: Student profile loaded successfully")
    console.log("📊 API: Student data:", {
      id: student.id,
      name: student.name,
      email: student.user?.email,
      classEnrollments: student.classEnrollments.length,
      hasEnrollmentData: !!student.enrollmentData
    })

    // Inyectar el email directamente en el objeto student para el frontend
    // y formatear números de teléfono para mostrar sin código de país
    const studentWithEmail = {
      ...student,
      email: student.user?.email || '',
      phone: formatPhoneForDisplay(student.phone),
      enrollmentData: student.enrollmentData ? {
        ...student.enrollmentData,
        emergencyContactPhone: formatPhoneForDisplay(student.enrollmentData.emergencyContactPhone),
        // Guardian fields removed - using emergency contact instead
      } : null
    }
    return NextResponse.json({
      success: true,
      student: studentWithEmail
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('❌ API: Error getting student profile:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userRole = session.user.role
    
    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario no válido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    console.log("🔍 API: Updating student with data:", body)
    
    let existingStudent;
    
    // Si es admin o teacher, puede editar cualquier estudiante usando studentId del body
    if ((userRole === 'ADMIN' || userRole === 'TEACHER') && body.studentId) {
      existingStudent = await prisma.student.findUnique({
        where: { id: body.studentId },
        include: {
          classEnrollments: true,
          enrollmentData: true
        }
      })
    } 
    // Si es admin sin studentId o es estudiante, buscar por userId
    else {
      existingStudent = await prisma.student.findFirst({
        where: { userId: parseInt(userId) },
        include: {
          classEnrollments: true,
          enrollmentData: true
        }
      })
    }

    // Obtener el userId real (entero) para actualizar el email
    const userIntId = existingStudent?.userId;

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      )
    }

    console.log("🔍 API: Found existing student:", existingStudent.id)

    // Actualizar datos básicos del estudiante (solo campos que están en la tabla Student)
    const studentUpdateData: any = {
      name: body.name,
      phone: formatPhoneForStorage(body.phone),
    }

    // Solo permitir que los administradores actualicen campos sensibles
    if (userRole === 'ADMIN') {
      if (body.isActive !== undefined) {
        studentUpdateData.isActive = body.isActive;
      }
    } else {
      // Si no es admin, mantener el valor actual del campo sensible
      studentUpdateData.isActive = existingStudent.isActive;
    }

    await prisma.student.update({
      where: { id: existingStudent.id },
      data: studentUpdateData
    })

    // Si el email cambió, actualizarlo en User
    if (body.email && userIntId) {
      await prisma.user.update({
        where: { id: userIntId },
        data: {
          email: body.email,
          role: 'STUDENT',
          isActive: true
        }
      })
    }

    // Si hay datos de enrollment, actualizarlos también
    if (body.enrollmentData) {
      console.log("🔍 API: Current monthlyFee:", existingStudent.enrollmentData?.monthlyFee);
      console.log("🔍 API: Requested monthlyFee:", body.enrollmentData.monthlyFee);
      const enrollmentUpdate: any = {
        documentType: body.enrollmentData.documentType,
        birthDate: body.enrollmentData.birthDate,
        address: body.enrollmentData.address,
        addressLatitude: body.enrollmentData.addressLatitude,
        addressLongitude: body.enrollmentData.addressLongitude,
        neighborhood: body.enrollmentData.neighborhood,
        city: body.enrollmentData.city,
        hasSisben: body.enrollmentData.hasSisben,
        eps: body.enrollmentData.eps,
        bloodType: body.enrollmentData.bloodType,
        hasRestrictions: body.enrollmentData.hasRestrictions,
        restrictionsDescription: body.enrollmentData.restrictionsDescription,
        medicalConditions: body.enrollmentData.medicalConditions,
        emergencyContactName: body.enrollmentData.emergencyContactName,
        emergencyContactRelation: body.enrollmentData.emergencyContactRelation,
        emergencyContactPhone: body.enrollmentData.emergencyContactPhone ? formatPhoneForStorage(body.enrollmentData.emergencyContactPhone) : null,
        paymentCutoffDay: body.enrollmentData.paymentCutoffDay,
        jerseyNumber: body.enrollmentData.jerseyNumber,
      }

      // Solo permitir que los administradores actualicen monthlyFee
      if (userRole === 'ADMIN' && body.enrollmentData.monthlyFee !== undefined) {
        enrollmentUpdate.monthlyFee = body.enrollmentData.monthlyFee;
        console.log("🔍 API: Admin updating monthlyFee to:", body.enrollmentData.monthlyFee);
      } else if (existingStudent.enrollmentData?.monthlyFee !== undefined) {
        // Si no es admin, mantener el valor actual
        enrollmentUpdate.monthlyFee = existingStudent.enrollmentData.monthlyFee;
        console.log("🔍 API: Non-admin, keeping current monthlyFee:", existingStudent.enrollmentData.monthlyFee);
      }

      // Permitir que administradores y profesores actualicen jerseyNumber
      if ((userRole === 'ADMIN' || userRole === 'TEACHER') && body.enrollmentData.jerseyNumber !== undefined) {
        enrollmentUpdate.jerseyNumber = body.enrollmentData.jerseyNumber;
        console.log("🔍 API: Authorized user updating jerseyNumber to:", body.enrollmentData.jerseyNumber);
      } else if (existingStudent.enrollmentData?.jerseyNumber !== undefined) {
        // Si no tiene permisos, mantener el valor actual
        enrollmentUpdate.jerseyNumber = existingStudent.enrollmentData.jerseyNumber;
        console.log("🔍 API: Non-authorized user, keeping current jerseyNumber:", existingStudent.enrollmentData.jerseyNumber);
      }

      await prisma.studentEnrollmentData.upsert({
        where: { studentId: existingStudent.id },
        update: enrollmentUpdate,
        create: {
          studentId: existingStudent.id,
          ...enrollmentUpdate
        }
      })
      
      // Verificar que se actualizó correctamente
      const updatedEnrollmentData = await prisma.studentEnrollmentData.findUnique({
        where: { studentId: existingStudent.id }
      });
      console.log("🔍 API: Updated monthlyFee in database:", updatedEnrollmentData?.monthlyFee);
    }

    // Si el estudiante se está desactivando, desactivar todas sus inscripciones.
    // Si se está reactivando, NO reactivar inscripciones automáticamente: una
    // inscripción inactiva puede serlo por transferencia, cancelación o eliminación
    // de clase, y reactivarlas en bloque corrompe el estado.
    if (
      body.isActive !== undefined &&
      body.isActive !== existingStudent.isActive &&
      body.isActive === false
    ) {
      await prisma.classEnrollment.updateMany({
        where: { studentId: existingStudent.id, isActive: true },
        data: { isActive: false }
      })
    }

    console.log("✅ API: Student profile updated successfully")

    return NextResponse.json({
      success: true,
      message: 'Perfil actualizado correctamente'
    })

  } catch (error) {
    console.error('❌ API: Error updating student profile:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
