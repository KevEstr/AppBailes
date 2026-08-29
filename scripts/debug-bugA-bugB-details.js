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
  // ============================================================
  // Bug A: ver notas/status de los grupos con misma terna
  // ============================================================
  console.log('='.repeat(100));
  console.log('BUG A — Notas y status de pagos en la MISMA terna (student+class+period)');
  console.log('='.repeat(100));

  const tripleIds = [
    // Mariangel Alzate
    { sid: '1022158053', classId: 4 },
    { sid: '1022158053', classId: 15 },
    // Maria Isabela Munera
    { sid: '1022157059', classId: 13 },
    // Mariangel Ortega
    { sid: '1021934727', classId: 63 },
    // Camila
    { sid: '1038872592', classId: 61 },
    // Mariangel Gutiérrez
    { sid: '1033496089', classId: 53 },
  ];

  for (const t of tripleIds) {
    const pays = await prisma.monthlyPayment.findMany({
      where: { studentId: t.sid, classId: t.classId },
      include: { period: true, danceClass: { select: { name: true, sport: true } } },
      orderBy: { periodId: 'asc' },
    });
    const name = (await prisma.student.findUnique({ where: { id: t.sid }, select: { name: true } }))?.name;
    console.log(`\n${name} | ClassId=${t.classId} ${pays[0]?.danceClass?.name || ''}`);
    for (const p of pays) {
      console.log(`  #${p.id} | ${p.period?.name} | ${p.status} | expected=$${p.expectedAmount} | paid=$${p.paidAmount ?? 0}`);
      console.log(`       notas: ${p.notes || '(vacío)'}`);
    }
  }

  // ============================================================
  // Bug B: ver estado REAL de inscripciones para los 7 estudiantes
  // ============================================================
  console.log('\n\n' + '='.repeat(100));
  console.log('BUG B — Estado de inscripciones (activa/inactiva/eliminada)');
  console.log('='.repeat(100));

  const bugBStudents = [
    { sid: '1032022232', name: 'Stephanie Gallo' },
    { sid: '1022160715', name: 'Maria Ángel Pineda' },
    { sid: '1023545786', name: 'Helen Céspedes' },
    { sid: '1022155981', name: 'Valery Garzon' },
    { sid: '1022160274', name: 'Maria Celeste Pardo' },
    { sid: '4702663', name: 'Danieilys Gonzáles' },
    { sid: '1033500921', name: 'Yoselyn Cano' },
  ];

  for (const s of bugBStudents) {
    console.log(`\n${s.name} (${s.sid})`);
    const enrs = await prisma.classEnrollment.findMany({
      where: { studentId: s.sid },
      include: { danceClass: { include: { trainer: { select: { name: true } } } } },
      orderBy: { enrolledAt: 'asc' },
    });
    if (enrs.length === 0) console.log('   (sin inscripciones en DB)');
    for (const e of enrs) {
      console.log(`   ClassId=${e.classId} "${e.danceClass.name}" (${e.danceClass.trainer?.name})`);
      console.log(`      isActive=${e.isActive} | sport=${e.danceClass.sport} | enrolled=${fmt(e.enrolledAt)} | updated=${fmt(e.updatedAt)}`);
    }
    const transfers = await prisma.studentTransfer.findMany({
      where: { studentId: s.sid },
      include: { fromClass: { select: { name: true } }, toClass: { select: { name: true } } },
      orderBy: { transferredAt: 'asc' },
    });
    console.log(`   Transferencias: ${transfers.map(t => `${t.fromClassId}("${t.fromClass.name}")→${t.toClassId}("${t.toClass.name}") @ ${fmt(t.transferredAt)}`).join(' ; ') || '(ninguna)'}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
