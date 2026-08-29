/**
 * Investigación profunda de pagos duplicados de Camila Cardona Quintero.
 * Enfocado en entender por qué hay tantos repetidos (especialmente Marzo 2026).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function fmt(d) {
  if (!d) return 'NULL';
  d = new Date(d);
  const offset = -5 * 60;
  const local = new Date(d.getTime() + offset * 60000);
  return local.toISOString().replace('T', ' ').substring(0, 19) + ' COT';
}

function fmtDate(d) {
  if (!d) return 'NULL';
  d = new Date(d);
  const offset = -5 * 60;
  const local = new Date(d.getTime() + offset * 60000);
  return local.toISOString().substring(0, 10);
}

async function main() {
  const SID = '1038872592';

  console.log('='.repeat(100));
  console.log('INVESTIGACIÓN: pagos de Camila Cardona Quintero (ID 1038872592)');
  console.log('='.repeat(100));

  // 1. Inscripciones
  console.log('\n1. INSCRIPCIONES (todas, incl. inactivas)');
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: SID },
    include: { danceClass: { include: { trainer: { select: { name: true } } } } },
    orderBy: { enrolledAt: 'asc' },
  });
  for (const e of enrollments) {
    console.log(`   #${e.id} | ClassId=${e.classId} "${e.danceClass.name}" (${e.danceClass.trainer?.name})`);
    console.log(`      isActive=${e.isActive} | cutoff=${e.paymentCutoffDay} | fee=${e.monthlyFee}`);
    console.log(`      enrolledAt=${fmt(e.enrolledAt)} | created=${fmt(e.createdAt)} | updated=${fmt(e.updatedAt)}`);
  }

  // 2. Transferencias
  console.log('\n2. TRANSFERENCIAS');
  const transfers = await prisma.studentTransfer.findMany({
    where: { studentId: SID },
    include: {
      fromClass: { select: { name: true } },
      toClass: { select: { name: true } },
    },
    orderBy: { transferredAt: 'asc' },
  });
  if (transfers.length === 0) console.log('   (ninguna)');
  for (const t of transfers) {
    console.log(`   #${t.id}: ${t.fromClassId}("${t.fromClass.name}") → ${t.toClassId}("${t.toClass.name}") | ${fmt(t.transferredAt)} | ${t.reason || 'N/A'}`);
  }

  // 3. TODOS los pagos, agrupados por período y clase
  console.log('\n3. TODOS LOS PAGOS (agrupados por período + clase)');
  const payments = await prisma.monthlyPayment.findMany({
    where: { studentId: SID },
    include: {
      period: true,
      danceClass: { select: { id: true, name: true, sport: true, trainer: { select: { name: true } } } },
    },
    orderBy: [
      { periodId: 'asc' },
      { classId: 'asc' },
      { id: 'asc' },
    ],
  });

  // Agrupar por (periodId, classId)
  const groups = new Map();
  for (const p of payments) {
    const key = `${p.periodId}|${p.classId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }

  for (const [key, group] of groups) {
    const first = group[0];
    const dup = group.length > 1;
    console.log(`\n   ${dup ? '🔴 DUPLICADO' : '   '} Período ${first.period.name} (id=${first.periodId}) | ClassId=${first.classId} "${first.danceClass.name}" (${first.danceClass.trainer?.name}) | ${first.danceClass.sport}`);
    for (const p of group) {
      console.log(`      #${p.id} | ${p.status} | expected=$${p.expectedAmount} | paid=$${p.paidAmount ?? 0} | due=${fmtDate(p.dueDate)} | creado=${fmt(p.createdAt)} | updated=${fmt(p.updatedAt)}`);
      if (p.notes) {
        const corte = p.notes.match(/Corte día (\d+)/);
        console.log(`         notas: ${p.notes}${corte ? ` [CORTE ${corte[1]}]` : ''}`);
      }
    }
  }

  // 4. Contar duplicados reales
  console.log('\n4. RESUMEN DE DUPLICADOS (misma terna studentId|periodId|classId)');
  let dupCount = 0;
  for (const [key, group] of groups) {
    if (group.length > 1) {
      dupCount++;
      const first = group[0];
      console.log(`   Período ${first.period.name} | ClassId=${first.classId} "${first.danceClass.name}" → ${group.length} pagos`);
      console.log(`      IDs: ${group.map(p => `#${p.id}(${p.status})`).join(', ')}`);
    }
  }
  console.log(`   Total grupos con duplicados: ${dupCount}`);

  // 5. Detalle específico de Marzo 2026
  console.log('\n5. DETALLE MARZO 2026');
  const march = payments.filter(p => p.period.year === 2026 && p.period.month === 3);
  console.log(`   Total pagos en Marzo 2026: ${march.length}`);
  for (const p of march) {
    console.log(`   #${p.id} | ClassId=${p.classId} "${p.danceClass.name}" | ${p.status} | $${p.expectedAmount} | due=${fmtDate(p.dueDate)} | creado=${fmt(p.createdAt)}`);
  }

  // 6. Recibos asociados
  console.log('\n6. RECIBOS');
  const receipts = await prisma.receipt.findMany({
    where: { studentId: SID },
    orderBy: { createdAt: 'asc' },
  });
  for (const r of receipts) {
    console.log(`   Recibo #${r.id} | $${r.amount} | ${r.paymentMethod} | monthlyPaymentId=${r.monthlyPaymentId} | ${fmt(r.createdAt)}`);
  }

  console.log('\n' + '='.repeat(100));
  console.log('FIN');
  console.log('='.repeat(100));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
