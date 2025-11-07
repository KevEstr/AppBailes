const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Script para relacionar receipts de octubre con monthly-payments
 * Este script ejecuta los cambios en la base de datos
 */
async function linkOctoberReceipts() {
  console.log('🔄 Iniciando relación de receipts de octubre con monthly-payments...\n');

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
    let updatedReceipts = 0;
    let updatedPayments = 0;

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
        
        // Verificar que el año del period coincida con el año del receipt
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

    // 4. Ejecutar actualizaciones
    console.log('='.repeat(80));
    console.log('🔄 EJECUTANDO ACTUALIZACIONES');
    console.log('='.repeat(80));
    console.log(`📊 Coincidencias encontradas: ${matches.length}\n`);

    for (const match of matches) {
      try {
        // Actualizar receipt con monthlyPaymentId
        await prisma.receipt.update({
          where: { id: match.receipt.id },
          data: {
            monthlyPaymentId: match.payment.id
          }
        });
        updatedReceipts++;

        // Actualizar monthly-payment como pagado
        await prisma.monthlyPayment.update({
          where: { id: match.payment.id },
          data: {
            status: 'PAID',
            paidAmount: match.receiptAmount,
            paymentDate: match.receipt.createdAt,
            approvedBy: '1',
            receivedAt: match.receipt.createdAt,
            markedAsPaidBy: '1',
            paymentMethod: match.receipt.paymentMethod
          }
        });
        updatedPayments++;

        const amountDiff = Math.abs(match.receiptAmount - match.expectedAmount);
        const discountNote = amountDiff > 0.01 ? ` (descuento: $${amountDiff.toFixed(2)})` : '';
        console.log(`✅ Receipt ${match.receipt.id} → Monthly Payment ${match.payment.id} (${match.receipt.student.name})${discountNote}`);
      } catch (error) {
        console.error(`❌ Error actualizando Receipt ${match.receipt.id}:`, error.message);
      }
    }

    // 5. Mostrar resumen final
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(80));
    console.log(`✅ Receipts actualizados: ${updatedReceipts}`);
    console.log(`✅ Monthly Payments actualizados: ${updatedPayments}`);
    console.log(`⚠️  Coincidencias con diferencia excesiva (>$5000, no actualizadas): ${amountMismatches.length}`);
    console.log(`❌ Sin coincidencias: ${noMatches.length}`);
    console.log('='.repeat(80));

    // Mostrar diferencias de monto si las hay (solo diferencias mayores a $5000)
    if (amountMismatches.length > 0) {
      console.log('\n⚠️  COINCIDENCIAS CON DIFERENCIA DE MONTO EXCESIVA (>$5000, no actualizadas):');
      console.log('-'.repeat(80));
      amountMismatches.forEach((mismatch, index) => {
        console.log(`${index + 1}. Receipt ${mismatch.receipt.id} - ${mismatch.receipt.student.name}`);
        console.log(`   Receipt: $${mismatch.receiptAmount.toFixed(2)} | Expected: $${mismatch.expectedAmount.toFixed(2)} | Diff: $${mismatch.difference.toFixed(2)}`);
      });
    }

    // Mostrar sin coincidencias si las hay
    if (noMatches.length > 0) {
      console.log('\n❌ RECEIPTS SIN COINCIDENCIAS:');
      console.log('-'.repeat(80));
      noMatches.forEach((noMatch, index) => {
        console.log(`${index + 1}. Receipt ${noMatch.receipt.id} - ${noMatch.receipt.student.name}: ${noMatch.reason}`);
      });
    }

  } catch (error) {
    console.error('❌ Error durante la ejecución:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar script
linkOctoberReceipts()
  .then(() => {
    console.log('\n✅ Proceso completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  });

