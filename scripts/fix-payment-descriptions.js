const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0', 10);

async function fixPaymentDescriptions() {
  console.log(`${DRY_RUN ? '🔍 DRY-RUN' : '🔄'} Buscando pagos con descripciones incorrectas...\n`);

  const allPayments = await prisma.monthlyPayment.findMany({
    where: {
      notes: { not: null },
    },
    include: {
      student: { select: { id: true, name: true } },
      period: { select: { id: true, name: true } },
      danceClass: { select: { id: true, name: true, sport: true } },
    },
    orderBy: [{ periodId: 'desc' }, { student: { name: 'asc' } }],
  });

  const toFix = [];
  const alreadyCorrect = [];
  const skipped = [];

  for (const p of allPayments) {
    const notes = (p.notes || '').trim();
    if (!notes) { skipped.push(p); continue; }
    if (notes.startsWith('Mensualidad')) { alreadyCorrect.push(p); continue; }
    if (notes.startsWith('Saldo restante de pago parcial')) { alreadyCorrect.push(p); continue; }
    toFix.push(p);
  }

  console.log(`📊 Total pagos con notes: ${allPayments.length}`);
  console.log(`📊 Ya correctos:           ${alreadyCorrect.length}`);
  console.log(`📊 Saltados (vacíos):      ${skipped.length}`);
  console.log(`📊 A corregir:             ${toFix.length}\n`);

  if (toFix.length === 0) {
    console.log('✅ No hay pagos para corregir');
    return;
  }

  const batch = LIMIT > 0 ? toFix.slice(0, LIMIT) : toFix;

  if (LIMIT > 0 && toFix.length > LIMIT) {
    console.log(`⚠️  Limitado a ${LIMIT} de ${toFix.length} pagos (usa --limit=0 para procesar todos)\n`);
  }

  let fixedCount = 0;
  let errorCount = 0;

  for (const payment of batch) {
    try {
      const enrollment = await prisma.classEnrollment.findFirst({
        where: { studentId: payment.studentId, classId: payment.classId },
        select: { paymentCutoffDay: true },
      });
      const cutoffDay = enrollment?.paymentCutoffDay ?? 30;

      const periodName = payment.period.name;
      const className = payment.danceClass.name;
      const currentNotes = payment.notes || '';

      const sportLabel = payment.danceClass.sport === 'DANCE' ? 'Baile' : 'Voleibol';
      const correctNotes = `Mensualidad ${periodName} - ${className} (${sportLabel}) (Corte día ${cutoffDay}) | ${currentNotes}`;

      if (DRY_RUN) {
        console.log(`📝 [DRY-RUN] Payment #${payment.id}`);
        console.log(`   Estudiante: ${payment.student.name}`);
        console.log(`   Período:    ${periodName}`);
        console.log(`   Clase:      ${className}`);
        console.log(`   Corte:      día ${cutoffDay}`);
        console.log(`   Actual:     "${payment.notes}"`);
        console.log(`   Correcta:   "${correctNotes}"`);
        console.log('');
        fixedCount++;
      } else {
        await prisma.monthlyPayment.update({
          where: { id: payment.id },
          data: { notes: correctNotes },
        });
        console.log(`✅ Payment #${payment.id} corregido: ${payment.student.name} - ${periodName} - ${className}`);
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error con payment #${payment.id}: ${error.message}`);
      errorCount++;
    }
  }

  const mode = DRY_RUN ? 'DRY-RUN (no se modificó la DB)' : 'EJECUTADO';
  console.log(`\n📊 Resumen (${mode}):`);
  console.log(`   Procesados: ${batch.length}`);
  console.log(`   Corregidos: ${fixedCount}`);
  console.log(`   Errores:    ${errorCount}`);
}

fixPaymentDescriptions()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
