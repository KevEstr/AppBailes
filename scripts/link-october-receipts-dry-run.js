const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script DRY-RUN para validar y relacionar receipts de octubre con monthly-payments
 * Este script solo muestra qué cambios se harían sin ejecutarlos
 */
async function linkOctoberReceiptsDryRun() {
  console.log('🔍 DRY-RUN: Validando receipts de octubre y sus monthly-payments...\n');

  try {
    // 1. Obtener todos los receipts creados en octubre (mes 10) de cualquier año
    // Buscar desde octubre 2020 hasta octubre 2025 para cubrir diferentes años
    const octoberReceipts = await prisma.receipt.findMany({
      where: {
        OR: [
          {
            createdAt: {
              gte: new Date('2020-10-01T00:00:00.000Z'),
              lt: new Date('2020-11-01T00:00:00.000Z')
            }
          },
          {
            createdAt: {
              gte: new Date('2021-10-01T00:00:00.000Z'),
              lt: new Date('2021-11-01T00:00:00.000Z')
            }
          },
          {
            createdAt: {
              gte: new Date('2022-10-01T00:00:00.000Z'),
              lt: new Date('2022-11-01T00:00:00.000Z')
            }
          },
          {
            createdAt: {
              gte: new Date('2023-10-01T00:00:00.000Z'),
              lt: new Date('2023-11-01T00:00:00.000Z')
            }
          },
          {
            createdAt: {
              gte: new Date('2024-10-01T00:00:00.000Z'),
              lt: new Date('2024-11-01T00:00:00.000Z')
            }
          },
          {
            createdAt: {
              gte: new Date('2025-10-01T00:00:00.000Z'),
              lt: new Date('2025-11-01T00:00:00.000Z')
            }
          }
        ],
        monthlyPaymentId: null // Solo los que no están relacionados
      },
      include: {
        student: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📋 Encontrados ${octoberReceipts.length} receipts de octubre sin relación\n`);

    if (octoberReceipts.length === 0) {
      console.log('✅ No hay receipts de octubre sin relacionar');
      return;
    }

    // 2. Obtener todos los monthly-payments que podrían coincidir (octubre de cualquier año)
    const monthlyPayments = await prisma.monthlyPayment.findMany({
      where: {
        studentId: {
          in: octoberReceipts.map(r => r.studentId)
        },
        period: {
          month: 10
          // No filtrar por año, buscar octubre de cualquier año
        }
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
            year: true,
            month: true,
            name: true
          }
        }
      }
    });

    console.log(`📋 Encontrados ${monthlyPayments.length} monthly-payments de octubre\n`);

    // 3. Procesar cada receipt y buscar coincidencias
    const matches = [];
    const noMatches = [];
    const amountMismatches = [];

    for (const receipt of octoberReceipts) {
      // Buscar monthly-payments del mismo estudiante
      const studentPayments = monthlyPayments.filter(
        mp => mp.studentId === receipt.studentId
      );

      if (studentPayments.length === 0) {
        noMatches.push({
          receipt,
          reason: 'No se encontró monthly-payment para este estudiante en octubre'
        });
        continue;
      }

      // Buscar coincidencia por mes en concept y notes
      let bestMatch = null;
      let matchScore = 0;

      for (const payment of studentPayments) {
        // Normalizar textos para comparación
        const receiptConcept = (receipt.concept || '').toLowerCase();
        const paymentNotes = (payment.notes || '').toLowerCase();
        
        // Buscar menciones de "octubre" en ambos (case-insensitive)
        // También buscar variaciones como "oct", "10", etc.
        const receiptHasOctober = receiptConcept.includes('octubre') || 
                                  receiptConcept.includes('oct ') ||
                                  receiptConcept.includes('oct.') ||
                                  receiptConcept.match(/\boct\b/i);
        const paymentHasOctober = paymentNotes.includes('octubre') || 
                                  paymentNotes.includes('oct ') ||
                                  paymentNotes.includes('oct.') ||
                                  paymentNotes.match(/\boct\b/i);
        
        // Verificar que el año del periodo coincida con el año del receipt
        const receiptYear = receipt.createdAt.getFullYear();
        const paymentYear = payment.period.year;
        const yearsMatch = receiptYear === paymentYear;

        // Calcular score de coincidencia
        let score = 0;
        if (receiptHasOctober && paymentHasOctober) score += 10;
        if (receipt.studentId === payment.studentId) score += 5;
        if (yearsMatch) score += 15; // Coincidencia de año es muy importante
        
        // Comparar amounts (con tolerancia de 5000 para descuentos)
        const amountDiff = Math.abs(receipt.amount - payment.expectedAmount);
        if (amountDiff < 0.01) {
          score += 20; // Coincidencia exacta de monto
        } else if (amountDiff <= 5000) {
          score += 15; // Diferencia aceptable (hasta $5000 por descuentos)
        } else if (amountDiff < payment.expectedAmount * 0.05) {
          score += 10; // Diferencia menor al 5%
        }

        if (score > matchScore) {
          matchScore = score;
          bestMatch = payment;
        }
      }

      // Solo considerar match si hay coincidencia de año y score mínimo
      if (!bestMatch || matchScore < 20) {
        noMatches.push({
          receipt,
          reason: matchScore < 20 ? 'Score de coincidencia muy bajo' : 'No se encontró coincidencia válida'
        });
        continue;
      }
      
      // Verificar que el año coincida (requisito obligatorio)
      const receiptYear = receipt.createdAt.getFullYear();
      const paymentYear = bestMatch.period.year;
      if (receiptYear !== paymentYear) {
        noMatches.push({
          receipt,
          reason: `Año no coincide: Receipt ${receiptYear} vs Payment ${paymentYear}`
        });
        continue;
      }

      // Verificar si los amounts coinciden (con tolerancia de $5000 para descuentos)
      const amountDiff = Math.abs(receipt.amount - bestMatch.expectedAmount);
      const amountsMatch = amountDiff <= 5000;

      if (!amountsMatch) {
        amountMismatches.push({
          receipt,
          payment: bestMatch,
          receiptAmount: receipt.amount,
          expectedAmount: bestMatch.expectedAmount,
          difference: amountDiff
        });
        continue;
      }

      matches.push({
        receipt,
        payment: bestMatch,
        receiptAmount: receipt.amount,
        expectedAmount: bestMatch.expectedAmount
      });
    }

    // 4. Mostrar resultados
    console.log('='.repeat(80));
    console.log('📊 RESUMEN DE COINCIDENCIAS');
    console.log('='.repeat(80));
    console.log(`✅ Coincidencias válidas (diferencia <= $5000): ${matches.length}`);
    console.log(`⚠️  Coincidencias con diferencia excesiva (>$5000): ${amountMismatches.length}`);
    console.log(`❌ Sin coincidencias: ${noMatches.length}`);
    console.log('='.repeat(80));
    console.log();

    // Mostrar coincidencias válidas
    if (matches.length > 0) {
      console.log('\n✅ COINCIDENCIAS VÁLIDAS (se relacionarían, diferencia <= $5000):');
      console.log('-'.repeat(80));
      matches.forEach((match, index) => {
        console.log(`\n${index + 1}. Receipt ID: ${match.receipt.id}`);
        console.log(`   Estudiante: ${match.receipt.student.name} (${match.receipt.studentId})`);
        console.log(`   Concept: ${match.receipt.concept}`);
        console.log(`   Amount: $${match.receiptAmount.toFixed(2)}`);
        console.log(`   Creado: ${match.receipt.createdAt.toISOString()}`);
        console.log(`   → Monthly Payment ID: ${match.payment.id}`);
        console.log(`   → Period: ${match.payment.period.name} (${match.payment.period.year}-${match.payment.period.month})`);
        console.log(`   → Expected Amount: $${match.expectedAmount.toFixed(2)}`);
        console.log(`   → Notes: ${match.payment.notes || '(sin notas)'}`);
        console.log(`   → Status actual: ${match.payment.status}`);
        const amountDiff = Math.abs(match.receiptAmount - match.expectedAmount);
        const hasDiscount = amountDiff > 0.01;
        console.log(`\n   📝 ACCIONES A REALIZAR:`);
        console.log(`   1. Actualizar receipt.monthlyPaymentId = ${match.payment.id}`);
        console.log(`   2. Actualizar payment.status = PAID`);
        console.log(`   3. Actualizar payment.paidAmount = ${match.receiptAmount.toFixed(2)}`);
        console.log(`   4. Actualizar payment.paymentDate = ${match.receipt.createdAt.toISOString()}`);
        console.log(`   5. Actualizar payment.approvedBy = "1"`);
        console.log(`   6. Actualizar payment.receivedAt = ${match.receipt.createdAt.toISOString()}`);
        console.log(`   7. Actualizar payment.markedAsPaidBy = "1"`);
        console.log(`   8. Actualizar payment.paymentMethod = ${match.receipt.paymentMethod}`);
        if (hasDiscount) {
          console.log(`   💡 Nota: Diferencia de $${amountDiff.toFixed(2)} (descuento aplicado)`);
        }
      });
    }

    // Mostrar diferencias de monto (solo diferencias mayores a $5000)
    if (amountMismatches.length > 0) {
      console.log('\n\n⚠️  COINCIDENCIAS CON DIFERENCIA DE MONTO EXCESIVA (>$5000):');
      console.log('-'.repeat(80));
      amountMismatches.forEach((mismatch, index) => {
        console.log(`\n${index + 1}. Receipt ID: ${mismatch.receipt.id}`);
        console.log(`   Estudiante: ${mismatch.receipt.student.name}`);
        console.log(`   Receipt Amount: $${mismatch.receiptAmount.toFixed(2)}`);
        console.log(`   Expected Amount: $${mismatch.expectedAmount.toFixed(2)}`);
        console.log(`   Diferencia: $${mismatch.difference.toFixed(2)}`);
        console.log(`   → Monthly Payment ID: ${mismatch.payment.id}`);
        console.log(`   ⚠️  NO SE RELACIONARÁN (diferencia mayor a $5000)`);
      });
    }

    // Mostrar sin coincidencias
    if (noMatches.length > 0) {
      console.log('\n\n❌ RECEIPTS SIN COINCIDENCIAS:');
      console.log('-'.repeat(80));
      noMatches.forEach((noMatch, index) => {
        console.log(`\n${index + 1}. Receipt ID: ${noMatch.receipt.id}`);
        console.log(`   Estudiante: ${noMatch.receipt.student.name} (${noMatch.receipt.studentId})`);
        console.log(`   Concept: ${noMatch.receipt.concept}`);
        console.log(`   Amount: $${noMatch.receipt.amount.toFixed(2)}`);
        console.log(`   Razón: ${noMatch.reason}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 ESTADÍSTICAS FINALES');
    console.log('='.repeat(80));
    console.log(`Total receipts de octubre: ${octoberReceipts.length}`);
    console.log(`✅ Se relacionarían (diferencia <= $5000): ${matches.length}`);
    console.log(`⚠️  Con diferencias excesivas (>$5000): ${amountMismatches.length}`);
    console.log(`❌ Sin coincidencias: ${noMatches.length}`);
    console.log('='.repeat(80));
    console.log('\n💡 Este es un DRY-RUN. Para ejecutar los cambios, usa: node scripts/link-october-receipts.js');

  } catch (error) {
    console.error('❌ Error durante la validación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar dry-run
linkOctoberReceiptsDryRun()
  .then(() => {
    console.log('\n✅ Dry-run completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el dry-run:', error);
    process.exit(1);
  });

