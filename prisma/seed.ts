import { PrismaClient, AttendanceStatus, PaymentMethod, MessageType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create trainers
  const trainer1 = await prisma.trainer.create({
    data: {
      name: 'María González',
      email: 'maria@danceacademy.com',
      phone: '1234567890',
    },
  })

  const trainer2 = await prisma.trainer.create({
    data: {
      name: 'Carlos Rodríguez',
      email: 'carlos@danceacademy.com',
      phone: '0987654321',
    },
  })

  // Create students
  const student1 = await prisma.student.create({
    data: {
      name: 'Ana Martínez',
      email: 'ana@example.com',
      phone: '5551234567',
      group: 'Principiante',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana',
    },
  })

  const student2 = await prisma.student.create({
    data: {
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '5559876543',
      group: 'Intermedio',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Juan',
    },
  })

  // Create some attendances
  await prisma.attendance.create({
    data: {
      studentId: student1.id,
      status: AttendanceStatus.PRESENT,
      date: new Date(),
    },
  })

  await prisma.attendance.create({
    data: {
      studentId: student2.id,
      status: AttendanceStatus.PRESENT,
      date: new Date(),
    },
  })

  // Create some receipts
  await prisma.receipt.create({
    data: {
      studentId: student1.id,
      amount: 100.00,
      concept: 'Mensualidad Enero',
      paymentMethod: PaymentMethod.CASH,
    },
  })

  // Create some debts
  await prisma.debt.create({
    data: {
      studentId: student2.id,
      amount: 150.00,
      concept: 'Mensualidad Diciembre',
      dueDate: new Date('2024-12-31'),
    },
  })

  // Create a massive message
  await prisma.massiveMessage.create({
    data: {
      type: MessageType.GENERAL,
      message: '¡Bienvenidos a la nueva temporada!',
      targetGroup: 'Todos',
      recipients: {
        connect: [
          { id: student1.id },
          { id: student2.id },
        ],
      },
    },
  })

  console.log('Database has been seeded. 🌱')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 