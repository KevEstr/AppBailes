/**
 * Verificación manual de 4 casos del BUG B para confirmar que NO son clases paralelas:
 * Helen Céspedes, Stephanie Gallo, Valery Garzon, Yoselyn Cano.
 *
 * Por cada estudiante muestra:
 *   - Inscripciones (enrolledAt, isActive, deactivatedAt) → ¿hubo solapamiento temporal?
 *   - Transferencias registradas
 *   - Pagos por período + clase (con fecha de creación y de pago)
 *   - Asistencias por mes + clase (proxy de participación real)
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

const CASES = [
  { sid: '1023545786', name: 'Helen Dahiana Céspedes Silva' },
  { sid: '1032022232', name: 'Stephanie Gallo García' },
  { sid: '1022155981', name: 'Valery Garzon Quiroz' },
  { sid: '1033500921', name: 'Yoselyn Cano Castrillon' },
];

async function main() {
  for (const c of CASES) {
    console.log('\n' + '='.repeat(110));
    console.log(`ESTUDIANTE: ${c.name} (${c.sid})`);
    console.log('='.repeat(110));

    // 1. Inscripciones
    console.log('\n  1. INSCRIPCIONES');
    const enrs = await prisma.classEnrollment.findMany({
      where: { studentId: c.sid },
      include: { danceClass: { include: { trainer: { select: { name: true } } } } },
      orderBy: { enrolledAt: 'asc' },
    });
    for (const e of enrs) {
      console.log(`     #${e.id} ClassId=${e.classId} "${e.danceClass.name}" (${e.danceClass.trainer?.name})`);
      console.log(`        isActive=${e.isActive} | enrolledAt=${fmt(e.enrolledAt)} | deactivatedAt=${fmt(e.deactivatedAt)} | updatedAt=${fmt(e.updatedAt)}`);
    }

    // 2. Transferencias
    console.log('\n  2. TRANSFERENCIAS');
    const transfers = await prisma.studentTransfer.findMany({
      where: { studentId: c.sid },
      include: { fromClass: { select: { name: true } }, toClass: { select: { name: true } } },
      orderBy: { transferredAt: 'asc' },
    });
    if (transfers.length === 0) console.log('     (ninguna)');
    for (const t of transfers) {
      console.log(`     #${t.id} type=${t.type} ${t.fromClassId}("${t.fromClass.name}") → ${t.toClassId ?? 'null'}("${t.toClass?.name ?? '—'}") @ ${fmt(t.transferredAt)} | "${t.reason || ''}"`);
    }

    // 3. Pagos por período
    console.log('\n  3. PAGOS POR PERÍODO');
    const payments = await prisma.monthlyPayment.findMany({
      where: { studentId: c.sid },
      include: { period: true, danceClass: { select: { id: true, name: true, sport: true } } },
      orderBy: [{ period: { year: 'asc' } }, { period: { month: 'asc' } }, { classId: 'asc' }, { id: 'asc' }],
    });
    for (const p of payments) {
      console.log(`     ${p.period.name.padEnd(14)} | ClassId=${p.classId} ${p.danceClass.name.slice(0, 35).padEnd(35)} | ${p.status.padEnd(12)} $${String(p.expectedAmount).padEnd(7)} | creado ${fmt(p.createdAt)} | pagado ${fmt(p.paymentDate)}`);
    }

    // 4. Asistencias por mes + clase
    console.log('\n  4. ASISTENCIAS (proxy de participación real)');
    const attendances = await prisma.attendance.findMany({
      where: { studentId: c.sid },
      include: { session: { include: { danceClass: { select: { name: true } } } } },
      orderBy: { date: 'asc' },
    });
    if (attendances.length === 0) {
      console.log('     (sin asistencias)');
    } else {
      const byMonthClass = new Map();
      for (const a of attendances) {
        const d = new Date(a.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}|${a.session?.classId}|${a.session?.danceClass?.name || '?'}`;
        if (!byMonthClass.has(key)) byMonthClass.set(key, 0);
        byMonthClass.set(key, byMonthClass.get(key) + 1);
      }
      for (const [key, count] of [...byMonthClass.entries()].sort()) {
        const [ym, classId, className] = key.split('|');
        console.log(`     ${ym} | ClassId=${classId} ${className} → ${count}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
