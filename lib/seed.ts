import { prisma } from "./prisma"
import { AttendanceStatus, PaymentMethod } from "@prisma/client"

export async function seedDatabase() {
  try {
    // Limpiar datos existentes
    await prisma.trainerAttendance.deleteMany()
    await prisma.trainer.deleteMany()
    await prisma.attendance.deleteMany()
    await prisma.receipt.deleteMany()
    await prisma.debt.deleteMany()
    await prisma.massiveMessage.deleteMany()
    await prisma.student.deleteMany()

    // Crear estudiantes
    const students = await Promise.all([
      prisma.student.create({
        data: {
          name: "María González",
          email: "maria.gonzalez@email.com",
          phone: "+58 414 123 4567",
          avatar: "/placeholder.svg?height=40&width=40",
          group: "Grupo Intermedio",
          hasDebt: false,
        },
      }),
      prisma.student.create({
        data: {
          name: "Carlos Rodríguez",
          email: "carlos.rodriguez@email.com",
          phone: "+58 424 987 6543",
          avatar: "/placeholder.svg?height=40&width=40",
          group: "Grupo Avanzado",
          hasDebt: true,
        },
      }),
      prisma.student.create({
        data: {
          name: "Ana Martínez",
          email: "ana.martinez@email.com",
          phone: "+58 412 555 7890",
          avatar: "/placeholder.svg?height=40&width=40",
          group: "Grupo Principiantes",
          hasDebt: false,
        },
      }),
      prisma.student.create({
        data: {
          name: "Luis Fernández",
          email: "luis.fernandez@email.com",
          phone: "+58 416 333 2222",
          avatar: "/placeholder.svg?height=40&width=40",
          group: "Entrenamiento Físico",
          hasDebt: true,
        },
      }),
      prisma.student.create({
        data: {
          name: "Sofia López",
          email: "sofia.lopez@email.com",
          phone: "+58 414 777 8888",
          avatar: "/placeholder.svg?height=40&width=40",
          group: "Grupo Intermedio",
          hasDebt: false,
        },
      }),
      prisma.student.create({
        data: {
          name: "Diego Morales",
          email: "diego.morales@email.com",
          phone: "+58 424 111 9999",
          avatar: "/placeholder.svg?height=40&width=40",
          group: "Grupo Avanzado",
          hasDebt: false,
        },
      }),
    ])

    // Crear entrenador
    const trainer = await prisma.trainer.create({
      data: {
        name: "Instructor Principal",
        email: "instructor@academia.com",
        phone: "+58 414 000 0000",
      },
    })

    // Crear algunas asistencias
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    await Promise.all([
      prisma.attendance.create({
        data: {
          studentId: students[0].id,
          status: AttendanceStatus.PRESENT,
          date: today,
        },
      }),
      prisma.attendance.create({
        data: {
          studentId: students[1].id,
          status: AttendanceStatus.LATE,
          date: today,
        },
      }),
      prisma.attendance.create({
        data: {
          studentId: students[2].id,
          status: AttendanceStatus.ABSENT,
          date: yesterday,
        },
      }),
    ])

    // Crear algunos recibos
    await Promise.all([
      prisma.receipt.create({
        data: {
          studentId: students[0].id,
          amount: 50.0,
          concept: "Mensualidad",
          paymentMethod: PaymentMethod.TRANSFER,
          whatsappSent: true,
          sentAt: new Date(),
        },
      }),
      prisma.receipt.create({
        data: {
          studentId: students[2].id,
          amount: 30.0,
          concept: "Inscripción",
          paymentMethod: PaymentMethod.CASH,
          promotion: "academia_50",
          whatsappSent: true,
          sentAt: new Date(),
        },
      }),
    ])

    // Crear deudas
    const dueDate1 = new Date()
    dueDate1.setDate(dueDate1.getDate() - 15)

    const dueDate2 = new Date()
    dueDate2.setDate(dueDate2.getDate() - 32)

    const dueDate3 = new Date()
    dueDate3.setDate(dueDate3.getDate() - 8)

    await Promise.all([
      prisma.debt.create({
        data: {
          studentId: students[1].id, // Carlos
          amount: 50.0,
          concept: "Mensualidad Octubre",
          dueDate: dueDate1,
        },
      }),
      prisma.debt.create({
        data: {
          studentId: students[3].id, // Luis
          amount: 75.0,
          concept: "Entrenamiento Físico",
          dueDate: dueDate2,
        },
      }),
      prisma.debt.create({
        data: {
          studentId: students[1].id, // Carlos (segunda deuda)
          amount: 30.0,
          concept: "Inscripción",
          dueDate: dueDate3,
        },
      }),
    ])

    console.log("✅ Base de datos inicializada correctamente")
    return { students, trainer }
  } catch (error) {
    console.error("❌ Error inicializando base de datos:", error)
    throw error
  }
}
