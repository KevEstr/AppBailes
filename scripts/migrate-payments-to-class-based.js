const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migratePaymentsToClassBased() {
  console.log('🔄 Iniciando migración de pagos a estructura basada en clases...');

  try {
    // 1. Obtener todos los pagos existentes que no tienen classId
    const existingPayments = await prisma.monthlyPayment.findMany({
      where: {
        classId: null
      },
      include: {
        student: {
          include: {
            classEnrollments: {
              where: { isActive: true },
              include: {
                danceClass: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Encontrados ${existingPayments.length} pagos para migrar`);

    let migratedCount = 0;
    let deletedCount = 0;

    for (const payment of existingPayments) {
      const student = payment.student;
      
      if (!student.classEnrollments || student.classEnrollments.length === 0) {
        console.log(`⚠️ Estudiante ${student.name} no tiene clases activas, eliminando pago ${payment.id}`);
        await prisma.monthlyPayment.delete({
          where: { id: payment.id }
        });
        deletedCount++;
        continue;
      }

      // Si el estudiante tiene múltiples clases, crear un pago por cada clase
      for (const enrollment of student.classEnrollments) {
        const classId = enrollment.danceClass.id;
        
        // Verificar si ya existe un pago para esta clase y período
        const existingClassPayment = await prisma.monthlyPayment.findFirst({
          where: {
            studentId: payment.studentId,
            classId: classId,
            periodId: payment.periodId
          }
        });

        if (existingClassPayment) {
          console.log(`⚠️ Ya existe pago para estudiante ${student.name} en clase ${enrollment.danceClass.name}, saltando...`);
          continue;
        }

        // Crear nuevo pago para esta clase
        await prisma.monthlyPayment.create({
          data: {
            studentId: payment.studentId,
            classId: classId,
            periodId: payment.periodId,
            feeConfigId: payment.feeConfigId,
            expectedAmount: payment.expectedAmount,
            paidAmount: payment.paidAmount,
            status: payment.status,
            paymentDate: payment.paymentDate,
            approvedBy: payment.approvedBy,
            notes: payment.notes ? `${payment.notes} (Migrado de pago único)` : 'Migrado de pago único',
            paymentMethod: payment.paymentMethod,
            receivedAt: payment.receivedAt,
            markedAsPaidBy: payment.markedAsPaidBy,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt
          }
        });

        console.log(`✅ Creado pago para ${student.name} en clase ${enrollment.danceClass.name}`);
        migratedCount++;
      }

      // Eliminar el pago original
      await prisma.monthlyPayment.delete({
        where: { id: payment.id }
      });
      console.log(`🗑️ Eliminado pago original ${payment.id} para ${student.name}`);
    }

    console.log(`\n📈 Migración completada:`);
    console.log(`   - Pagos migrados: ${migratedCount}`);
    console.log(`   - Pagos eliminados (sin clases): ${deletedCount}`);
    console.log(`   - Total procesados: ${existingPayments.length}`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración
migratePaymentsToClassBased()
  .then(() => {
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  });
