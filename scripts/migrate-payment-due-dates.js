const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Calcula la fecha de vencimiento basada en el día de corte de la clase
 */
function calculateDueDate(cutoffDay, period) {
  const { year, month } = period;
  
  // Calcular el mes de vencimiento
  let dueMonth = month;
  let dueYear = year;
  
  if (cutoffDay === 15) {
    // Para corte del 15, vence el 20 del mismo mes
    dueMonth = month;
    dueYear = year;
  } else if (cutoffDay === 30) {
    // Para corte del 30, vence el 5 del mes siguiente
    dueMonth = month + 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear = year + 1;
    }
  } else {
    // Fallback: vence 5 días después del corte
    dueMonth = month;
    dueYear = year;
  }
  
  // Crear la fecha de vencimiento
  const dueDay = cutoffDay === 15 ? 20 : 5;
  const dueDate = new Date(dueYear, dueMonth - 1, dueDay, 23, 59, 59);
  
  return dueDate;
}

async function migratePaymentDueDates() {
  try {
    console.log('🔄 Iniciando migración de fechas de vencimiento de pagos...');

    // Obtener todos los pagos que no tienen dueDate
    const paymentsWithoutDueDate = await prisma.monthlyPayment.findMany({
      where: {
        dueDate: null
      },
      include: {
        period: true,
        danceClass: {
          include: {
            enrollments: {
              where: {
                isActive: true
              },
              select: {
                paymentCutoffDay: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Encontrados ${paymentsWithoutDueDate.length} pagos sin fecha de vencimiento`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const payment of paymentsWithoutDueDate) {
      try {
        // Determinar el día de corte
        let cutoffDay = 30; // Default
        
        if (payment.danceClass && payment.danceClass.enrollments.length > 0) {
          // Usar el día de corte de la clase
          cutoffDay = payment.danceClass.enrollments[0].paymentCutoffDay || 30;
        } else {
          // Fallback: buscar en la configuración del estudiante
          const studentEnrollment = await prisma.studentEnrollmentData.findUnique({
            where: { studentId: payment.studentId }
          });
          
          if (studentEnrollment?.paymentCutoffDay) {
            cutoffDay = studentEnrollment.paymentCutoffDay;
          }
        }

        // Calcular la fecha de vencimiento
        const dueDate = calculateDueDate(cutoffDay, {
          year: payment.period.year,
          month: payment.period.month
        });

        // Actualizar el pago
        await prisma.monthlyPayment.update({
          where: { id: payment.id },
          data: { dueDate }
        });

        console.log(`✅ Pago ${payment.id}: Corte día ${cutoffDay} → Vence ${dueDate.toLocaleDateString()}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error actualizando pago ${payment.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Resumen de migración:');
    console.log(`✅ Pagos actualizados: ${updatedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${paymentsWithoutDueDate.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
    } else {
      console.log('\n⚠️ Migración completada con algunos errores. Revisa los logs anteriores.');
    }

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migratePaymentDueDates()
    .then(() => {
      console.log('✅ Script de migración finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script de migración:', error);
      process.exit(1);
    });
}

module.exports = { migratePaymentDueDates, calculateDueDate };
