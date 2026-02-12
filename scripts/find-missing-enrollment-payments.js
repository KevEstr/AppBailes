const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script para detectar posibles pagos de inscripción
 * que quedaron solo en recibos y NO tienen registro
 * en la tabla de EnrollmentPayment para el deporte correcto.
 *
 * Criterios:
 * - Receipts con amount >= 100000
 * - Y cuyo campo "notes" contenga la palabra "Inscripción"
 *
 * Para cada receipt:
 * 1. Determina el deporte del pago:
 *    - Si tiene monthlyPayment con danceClass asociado, usa ese sport.
 *    - En caso contrario, usa el deporte principal del estudiante
 *      (prioriza DANCE si está en ambos).
 * 2. Verifica si existe un EnrollmentPayment con (studentId, sport).
 * 3. Si NO existe, lo reporta como caso problemático.
 *
 * Uso:
 *   node scripts/find-missing-enrollment-payments.js
 */
async function findMissingEnrollmentPayments() {
  console.log('🔍 Buscando receipts que parecen pagos de inscripción sin registro en EnrollmentPayment...\n');

  try {
    // 1. Buscar receipts candidatos
    const candidateReceipts = await prisma.receipt.findMany({
      where: {
        amount: {
          gte: 100000,
        },
        notes: {
          contains: 'Inscripción',
          mode: 'insensitive',
        },
      },
      include: {
        student: {
          include: {
            classEnrollments: {
              include: {
                danceClass: {
                  select: { sport: true },
                },
              },
            },
          },
        },
        monthlyPayment: {
          include: {
            danceClass: {
              select: { sport: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`📋 Receipts candidatos encontrados (amount >= 100000 y notes contiene "Inscripción"): ${candidateReceipts.length}\n`);

    if (candidateReceipts.length === 0) {
      console.log('✅ No se encontraron receipts que cumplan los criterios.');
      return;
    }

    const missingEnrollmentPayments = [];

    for (const receipt of candidateReceipts) {
      // 2. Determinar deporte del recibo
      let sport = null;

      if (receipt.monthlyPayment?.classId && receipt.monthlyPayment?.danceClass) {
        // Usar deporte de la clase específica del pago mensual
        sport = receipt.monthlyPayment.danceClass.sport;
      } else {
        // Fallback: deporte principal del estudiante (mismo criterio que DigitalReceiptService)
        const enrollments = receipt.student.classEnrollments || [];
        const sports = [...new Set(enrollments.map((enrollment) => enrollment.danceClass?.sport).filter(Boolean))];
        if (sports.length > 0) {
          sport = sports.includes('DANCE') ? 'DANCE' : sports[0];
        }
      }

      if (!sport) {
        // Si no podemos determinar deporte, igual lo reportamos aparte
        missingEnrollmentPayments.push({
          type: 'NO_SPORT_DETECTED',
          receipt,
          sport: null,
          reason: 'No se pudo determinar el deporte (sin classId ni enrollments con sport).',
        });
        continue;
      }

      // 3. Verificar si existe EnrollmentPayment para (studentId, sport)
      const existingEnrollment = await prisma.enrollmentPayment.findFirst({
        where: {
          studentId: receipt.studentId,
          sport: sport,
        },
      });

      if (!existingEnrollment) {
        missingEnrollmentPayments.push({
          type: 'MISSING_ENROLLMENT_PAYMENT',
          receipt,
          sport,
          reason: 'No existe registro en EnrollmentPayment para este estudiante y deporte.',
        });
      }
    }

    // 4. Mostrar resultados
    console.log('='.repeat(80));
    console.log('📊 RESULTADOS: Receipts de inscripción sin EnrollmentPayment asociado');
    console.log('='.repeat(80));
    console.log(`Total receipts candidatos: ${candidateReceipts.length}`);
    console.log(`❌ Casos SIN EnrollmentPayment: ${missingEnrollmentPayments.filter((x) => x.type === 'MISSING_ENROLLMENT_PAYMENT').length}`);
    console.log(`⚠️ Casos SIN deporte detectado: ${missingEnrollmentPayments.filter((x) => x.type === 'NO_SPORT_DETECTED').length}`);
    console.log('='.repeat(80));

    if (missingEnrollmentPayments.length === 0) {
      console.log('\n✅ Todos los receipts candidatos tienen un EnrollmentPayment correspondiente.');
      return;
    }

    // Listado detallado
    for (const [index, item] of missingEnrollmentPayments.entries()) {
      const { receipt, sport, reason, type } = item;
      console.log(`\n${index + 1}. Receipt ID: ${receipt.id}`);
      console.log(`   Estudiante: ${receipt.student?.name || 'Desconocido'} (${receipt.studentId})`);
      console.log(`   Fecha: ${receipt.createdAt.toISOString()}`);
      console.log(`   Monto: $${receipt.amount.toLocaleString('es-CO')}`);
      console.log(`   Notes: ${receipt.notes || '(sin notas)'}`);
      console.log(`   MonthlyPaymentId: ${receipt.monthlyPaymentId || '(null)'}`);
      console.log(`   Deporte detectado: ${sport || '(no determinado)'}`);
      console.log(`   Tipo caso: ${type}`);
      console.log(`   Razón: ${reason}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('💡 Usa este listado para mapear los casos problemáticos y decidir cómo corregirlos manualmente o con otro script.');
    console.log('='.repeat(80));
  } catch (error) {
    console.error('❌ Error ejecutando el script:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
findMissingEnrollmentPayments()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la ejecución del script:', error);
    process.exit(1);
  });

