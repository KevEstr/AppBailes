const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const r = await prisma.monthlyPayment.groupBy({
    by: ['studentId', 'classId', 'periodId'],
    _count: { id: true },
    having: { id: { _count: { gt: 1 } } },
  });

  console.log('Grupos (student,class,period) con >1 pago:', r.length);
  const total = r.reduce((s, g) => s + g._count.id, 0);
  console.log('Total pagos en esos grupos:', total);
  console.log('Total pagos excedentes (duplicados):', total - r.length);

  const byStud = new Map();
  for (const g of r) {
    byStud.set(g.studentId, (byStud.get(g.studentId) || 0) + g._count.id - 1);
  }
  console.log('Estudiantes afectados:', byStud.size);

  const sorted = [...byStud.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nTop estudiantes con más duplicados:');
  for (const [sid, n] of sorted) {
    const s = await prisma.student.findUnique({ where: { id: sid }, select: { name: true, phone: true } });
    console.log(`  ${sid} | ${s ? s.name : '?'} | ${s ? s.phone : '?'} -> ${n} pagos extra`);
  }

  // Detalle de períodos afectados
  console.log('\nDesglose por período de los duplicados:');
  const byPeriod = new Map();
  for (const g of r) {
    const extra = g._count.id - 1;
    const key = g.periodId;
    if (!byPeriod.has(key)) byPeriod.set(key, 0);
    byPeriod.set(key, byPeriod.get(key) + extra);
  }
  const periodIds = [...byPeriod.keys()];
  const periods = await prisma.paymentPeriod.findMany({ where: { id: { in: periodIds } } });
  const periodName = new Map(periods.map(p => [p.id, p.name]));
  for (const [pid, count] of [...byPeriod.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${periodName.get(pid) || pid}: ${count} duplicados`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
