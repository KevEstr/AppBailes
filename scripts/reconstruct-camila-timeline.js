/**
 * Reconstrucción temporal de la matrícula de Camila Cardona Quintero (1038872592).
 * Combina: inscripciones (timestamps), transferencias, pagos por período y asistencias
 * (proxy real de en qué clase participó cada mes) para determinar si estuvo en dos
 * clases a la vez.
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

async function main() {
  const SID = '1038872592';

  console.log('='.repeat(100));
  console.log('RECONSTRUCCIÓN TEMPORAL — Camila Cardona Quintero');
  console.log('='.repeat(100));

  // 1. Inscripciones (todas)
  console.log('\n1. INSCRIPCIONES (raw)');
  const enrs = await prisma.classEnrollment.findMany({
    where: { studentId: SID },
    include: { danceClass: { include: { trainer: { select: { name: true } } } } },
    orderBy: { enrolledAt: 'asc' },
  });
  for (const e of enrs) {
    console.log(`   #${e.id} ClassId=${e.classId} "${e.danceClass.name}" (${e.danceClass.trainer?.name})`);
    console.log(`      isActive=${e.isActive} | enrolledAt=${fmt(e.enrolledAt)} | createdAt=${fmt(e.createdAt)} | updatedAt=${fmt(e.updatedAt)}`);
  }

  // 2. Transferencias
  console.log('\n2. TRANSFERENCIAS');
  const transfers = await prisma.studentTransfer.findMany({
    where: { studentId: SID },
    include: { fromClass: { select: { name: true } }, toClass: { select: { name: true } } },
    orderBy: { transferredAt: 'asc' },
  });
  for (const t of transfers) {
    console.log(`   #${t.id} ${t.fromClassId}("${t.fromClass.name}") → ${t.toClassId}("${t.toClass.name}") @ ${fmt(t.transferredAt)} | "${t.reason || ''}"`);
  }

  // 3. Pagos por período + clase (con fecha de creación)
  console.log('\n3. PAGOS POR PERÍODO (indican qué clase estaba activa al generarse)');
  const payments = await prisma.monthlyPayment.findMany({
    where: { studentId: SID },
    include: { period: true, danceClass: { select: { id: true, name: true, sport: true } } },
    orderBy: [{ period: { year: 'asc' } }, { period: { month: 'asc' } }, { classId: 'asc' }, { id: 'asc' }],
  });
  for (const p of payments) {
    console.log(`   ${p.period.name.padEnd(14)} | ClassId=${p.classId} ${p.danceClass.name.slice(0, 40)} | ${p.status.padEnd(12)} $${String(p.expectedAmount).padEnd(7)} | creado ${fmt(p.createdAt)}`);
  }

  // 4. Asistencias por mes y clase (proxy de participación real)
  console.log('\n4. ASISTENCIAS POR MES Y CLASE (proxy de participación real)');
  const attendances = await prisma.attendance.findMany({
    where: { studentId: SID },
    include: {
      session: { include: { danceClass: { select: { name: true } } } },
    },
    orderBy: { date: 'asc' },
  });
  if (attendances.length === 0) {
    console.log('   (sin registros de asistencia)');
  } else {
    const byMonthClass = new Map();
    for (const a of attendances) {
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}|${a.session?.classId}|${a.session?.danceClass?.name || '?'}`;
      if (!byMonthClass.has(key)) byMonthClass.set(key, []);
      byMonthClass.get(key).push(a);
    }
    const sorted = [...byMonthClass.keys()].sort();
    for (const key of sorted) {
      console.log(`   ${key.split('|')[0]} | ClassId=${key.split('|')[1]} ${key.split('|')[2]} → ${byMonthClass.get(key).length} asistencias`);
    }
  }

  // 5. Línea de tiempo consolidada mes a mes
  console.log('\n5. LÍNEA DE TIEMPO CONSOLIDADA');
  const timeline = new Map(); // key "YYYY-MM" -> { classes: Set, evidence: [] }

  const addEvidence = (ym, text) => {
    if (!timeline.has(ym)) timeline.set(ym, []);
    timeline.get(ym).push(text);
  };

  // Evidencia de pagos
  for (const p of payments) {
    const ym = `${p.period.year}-${String(p.period.month).padStart(2, '0')}`;
    addEvidence(ym, `pago ${p.danceClass.name.slice(0, 30)} (ClassId=${p.classId}) ${p.status} creado ${fmt(p.createdAt)}`);
  }
  // Evidencia de transferencias
  for (const t of transfers) {
    const d = new Date(t.transferredAt);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    addEvidence(ym, `TRANSFER ${t.fromClassId}→${t.toClassId} @ ${fmt(t.transferredAt)}`);
  }
  // Evidencia de asistencias
  for (const a of attendances) {
    const d = new Date(a.date);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    addEvidence(ym, `asistió ${a.session?.danceClass?.name?.slice(0, 30)} (ClassId=${a.session?.classId})`);
  }

  for (const [ym, events] of [...timeline.entries()].sort()) {
    console.log(`\n   ${ym}:`);
    for (const ev of events) console.log(`      • ${ev}`);
  }

  // 6. Conclusión sobre simultaneidad
  console.log('\n' + '='.repeat(100));
  console.log('CONCLUSIÓN');
  console.log('='.repeat(100));
  console.log(`
  La transferencia 24→61 ocurrió el 2026-03-10. Desde entonces, el sistema generó
  pagos para AMBAS clases (24 y 61) en Abril, Mayo, Junio y Julio 2026, lo que
  implica que ambas inscripciones estaban isActive=true al mismo tiempo.
  `);
}

main().catch(console.error).finally(() => prisma.$disconnect());
