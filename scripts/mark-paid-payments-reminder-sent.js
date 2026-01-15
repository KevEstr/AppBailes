const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Marca los pagos pagados como que ya recibieron recordatorio
 * Esto evita que aparezcan en el envío masivo de recordatorios
 */
async function markPaidPaymentsReminderSent() {
  try {
    console.log('🔄 Iniciando marcado de recordatorios enviados para pagos pagados...\n');

    // Buscar todos los pagos que están pagados pero no tienen reminderSent marcado
    const paidPayments = await prisma.monthlyPayment.findMany({
      where: {
        status: {
          in: ['PAID', 'PARTIAL_PAID']
        },
        reminderSent: false
      },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        },
        period: {
          select: {
            id: true,
            name: true,
            year: true,
            month: true
          }
        },
        danceClass: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    console.log(`📊 Encontrados ${paidPayments.length} pagos pagados sin recordatorio marcado\n`);

    if (paidPayments.length === 0) {
      console.log('✅ No hay pagos para actualizar');
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;
    const now = new Date();

    // Agrupar por período para mostrar estadísticas
    const statsByPeriod = {};

    for (const payment of paidPayments) {
      try {
        // Usar la fecha de pago como fecha de envío del recordatorio si existe,
        // de lo contrario usar la fecha actual
        const reminderSentAt = payment.paymentDate || payment.receivedAt || now;

        await prisma.monthlyPayment.update({
          where: { id: payment.id },
          data: {
            reminderSent: true,
            reminderSentAt: reminderSentAt
          }
        });

        // Estadísticas por período
        const periodKey = payment.period.name;
        if (!statsByPeriod[periodKey]) {
          statsByPeriod[periodKey] = {
            count: 0,
            period: payment.period
          };
        }
        statsByPeriod[periodKey].count++;

        console.log(`✅ Pago ${payment.id}: ${payment.student.name} - ${payment.period.name} - $${payment.expectedAmount.toLocaleString()}`);
        updatedCount++;

      } catch (error) {
        console.error(`❌ Error actualizando pago ${payment.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Resumen de actualización:');
    console.log(`✅ Pagos actualizados: ${updatedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${paidPayments.length}`);

    if (Object.keys(statsByPeriod).length > 0) {
      console.log('\n📅 Estadísticas por período:');
      Object.entries(statsByPeriod)
        .sort((a, b) => {
          // Ordenar por año y mes
          const periodA = a[1].period;
          const periodB = b[1].period;
          if (periodA.year !== periodB.year) {
            return periodB.year - periodA.year;
          }
          return periodB.month - periodA.month;
        })
        .forEach(([periodName, stats]) => {
          console.log(`   - ${periodName}: ${stats.count} pagos`);
        });
    }

    if (errorCount === 0) {
      console.log('\n🎉 ¡Actualización completada exitosamente!');
      console.log('💡 Los pagos pagados ahora están marcados como que recibieron recordatorio');
      console.log('   y no aparecerán en el envío masivo de recordatorios.');
    } else {
      console.log('\n⚠️ Actualización completada con algunos errores. Revisa los logs anteriores.');
    }

  } catch (error) {
    console.error('❌ Error durante la actualización:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script si se llama directamente
if (require.main === module) {
  markPaidPaymentsReminderSent()
    .then(() => {
      console.log('\n✅ Script finalizado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en script:', error);
      process.exit(1);
    });
}

module.exports = { markPaidPaymentsReminderSent };





