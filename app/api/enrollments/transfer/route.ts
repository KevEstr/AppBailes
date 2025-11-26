import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/nextauth'

const transferSchema = z.object({
  studentId: z.string().min(1, 'ID de estudiante es requerido'),
  fromClassId: z.number().int().positive('ID de clase origen debe ser un número positivo'),
  toClassId: z.number().int().positive('ID de clase destino debe ser un número positivo'),
  reason: z.string().optional()
})

// POST - Transferir estudiante entre grupos
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = transferSchema.parse(body)

    // Verificar que el estudiante existe
    const student = await prisma.student.findUnique({
      where: { id: validatedData.studentId }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que las clases existen
    const [fromClass, toClass] = await Promise.all([
      prisma.danceClass.findUnique({
        where: { id: validatedData.fromClassId },
        include: {
          _count: {
            select: {
              enrollments: {
                where: { isActive: true }
              }
            }
          }
        }
      }),
      prisma.danceClass.findUnique({
        where: { id: validatedData.toClassId },
        include: {
          _count: {
            select: {
              enrollments: {
                where: { isActive: true }
              }
            }
          }
        }
      })
    ])

    if (!fromClass || !toClass) {
      return NextResponse.json(
        { error: 'Una o ambas clases no encontradas' },
        { status: 404 }
      )
    }

    // Verificar que las clases son del mismo deporte
    if (fromClass.sport !== toClass.sport) {
      return NextResponse.json(
        { error: 'No se puede transferir entre diferentes deportes' },
        { status: 400 }
      )
    }

    // Verificar que el estudiante está inscrito en la clase origen
    const currentEnrollment = await prisma.classEnrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: validatedData.studentId,
          classId: validatedData.fromClassId
        }
      }
    })

    if (!currentEnrollment || !currentEnrollment.isActive) {
      return NextResponse.json(
        { error: 'El estudiante no está inscrito en la clase origen' },
        { status: 400 }
      )
    }

    // Verificar capacidad de la clase destino
    if (toClass._count.enrollments >= toClass.capacity) {
      return NextResponse.json(
        { error: 'La clase destino ha alcanzado su capacidad máxima' },
        { status: 400 }
      )
    }

    // Verificar que no esté ya inscrito en la clase destino
    const existingEnrollment = await prisma.classEnrollment.findUnique({
      where: {
        studentId_classId: {
          studentId: validatedData.studentId,
          classId: validatedData.toClassId
        }
      }
    })

    if (existingEnrollment && existingEnrollment.isActive) {
      return NextResponse.json(
        { error: 'El estudiante ya está inscrito en la clase destino' },
        { status: 400 }
      )
    }

    // Obtener el período activo actual para borrar pagos pendientes
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth() + 1
    
    const activePeriod = await prisma.paymentPeriod.findFirst({
      where: {
        year: currentYear,
        month: currentMonth,
        isActive: true
      }
    })

    // Realizar la transferencia en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Desactivar inscripción actual
      await tx.classEnrollment.update({
        where: { id: currentEnrollment.id },
        data: { isActive: false }
      })

      // Crear nueva inscripción o reactivar existente
      let newEnrollment
      if (existingEnrollment && !existingEnrollment.isActive) {
        newEnrollment = await tx.classEnrollment.update({
          where: { id: existingEnrollment.id },
          data: { 
            isActive: true,
            enrolledAt: new Date()
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                phone: true,
                user: { select: { email: true } }
              }
            },
            danceClass: {
              include: {
                trainer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        })
      } else {
        newEnrollment = await tx.classEnrollment.create({
          data: {
            studentId: validatedData.studentId,
            classId: validatedData.toClassId
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                phone: true,
                user: { select: { email: true } }
              }
            },
            danceClass: {
              include: {
                trainer: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        })
      }

      // Registrar la transferencia
      const transfer = await tx.studentTransfer.create({
        data: {
          studentId: validatedData.studentId,
          fromClassId: validatedData.fromClassId,
          toClassId: validatedData.toClassId,
          transferredBy: parseInt(session.user.id),
          reason: validatedData.reason
        }
      })

      // Borrar pagos PENDING/OVERDUE de la clase vieja para el período actual
      // SOLO si NO hay pagos PAID o PARTIAL_PAID (para no afectar pagos ya realizados)
      // Solo si existe un período activo
      if (activePeriod) {
        // Primero verificar si hay pagos PAID o PARTIAL_PAID en la clase vieja
        const paidOrPartialPayments = await tx.monthlyPayment.findFirst({
          where: {
            studentId: validatedData.studentId,
            classId: validatedData.fromClassId,
            periodId: activePeriod.id,
            status: {
              in: ['PAID', 'PARTIAL_PAID']
            }
          }
        })

        // Solo borrar pagos pendientes si NO hay pagos completados o parciales
        // Si hay PAID o PARTIAL_PAID, dejar todo como está (incluyendo pendientes)
        if (!paidOrPartialPayments) {
          const deletedPayments = await tx.monthlyPayment.deleteMany({
            where: {
              studentId: validatedData.studentId,
              classId: validatedData.fromClassId,
              periodId: activePeriod.id,
              status: {
                in: ['PENDING', 'OVERDUE']
              }
            }
          })

          // Log para debugging (opcional)
          if (deletedPayments.count > 0) {
            console.log(`🗑️ Eliminados ${deletedPayments.count} pago(s) pendiente(s) de la clase ${validatedData.fromClassId} para el estudiante ${validatedData.studentId}`)
          }
        } else {
          console.log(`ℹ️ No se eliminaron pagos pendientes de la clase ${validatedData.fromClassId} porque existe un pago ${paidOrPartialPayments.status} (se mantiene el estado actual)`)
        }
      }

      return { newEnrollment, transfer }
    })

    return NextResponse.json({ 
      success: true, 
      enrollment: result.newEnrollment,
      transfer: result.transfer
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('Error transferring student:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// GET - Obtener historial de transferencias de un estudiante
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return NextResponse.json(
        { error: 'ID de estudiante requerido' },
        { status: 400 }
      )
    }

    const transfers = await prisma.studentTransfer.findMany({
      where: { studentId },
      include: {
        fromClass: {
          select: {
            id: true,
            name: true,
            level: true,
            trainer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        toClass: {
          select: {
            id: true,
            name: true,
            level: true,
            trainer: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { transferredAt: 'desc' }
    })

    return NextResponse.json({ success: true, transfers })

  } catch (error) {
    console.error('Error fetching transfers:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
} 