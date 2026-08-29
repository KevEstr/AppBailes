/**
 * Script v4: detección de doble cobro — reglas precisas.
 *
 * BUG A — Duplicados REALES en la misma terna (studentId, classId, periodId):
 *   Múltiples mensualidades COMPLETAS (sin pagos parciales) para el mismo
 *   estudiante+clase+período. Se descarta si el grupo contiene un pago parcial
 *   (status PARTIAL_PAID o notas con "Pago parcial"/"Saldo restante").
 *
 * BUG B — Doble cobro por MOVIMIENTO real de clase:
 *   Requiere que la clase ORIGEN (donde pagó) esté INACTIVA/ELIMINADA (el estudiante
 *   la dejó) y la clase DESTINO (donde está el pendiente) esté ACTIVA. Si el estudiante
 *   está activo en AMBAS clases es matrícula simultánea (válida), NO es bug.
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function fmt(d) {
  if (!d) return 'NULL';
  d = new Date(d);
  const offset = -5 * 60;
  const local = new Date(d.getTime() + offset * 60000);
  return local.toISOString().replace('T', ' ').substring(0, 19) + ' COT';
}

function hasPath(from, to, chainMap, visited = new Set()) {
  if (from === to) return false;
  if (visited.has(from)) return false;
  visited.add(from);
  const edges = chainMap.get(from) ?? [];
  for (const e of edges) {
    if (e.toClassId === to) return true;
    if (hasPath(e.toClassId, to, chainMap, visited)) return true;
  }
  return false;
}

/** Un pago es "parcial" si es PARTIAL_PAID o sus notas lo marcan como parcial/saldo. */
function isPartialPayment(p) {
  const notes = (p.notes || '');
  return (
    p.status === 'PARTIAL_PAID' ||
    notes.includes('Pago parcial') ||
    notes.includes('Saldo restante')
  );
}

async function main() {
  console.log('='.repeat(110));
  console.log('DETECCIÓN DE DOBLE COBRO v4');
  console.log('='.repeat(110));

  const allPayments = await prisma.monthlyPayment.findMany({
    include: {
      student: { select: { id: true, name: true, phone: true } },
      period: true,
      danceClass: { select: { id: true, name: true, sport: true } },
    },
    orderBy: [{ periodId: 'asc' }, { id: 'asc' }],
  });

  // Conjunto de clases con inscripción ACTIVA por estudiante (clave "studentId|classId").
  const activeEnrollments = await prisma.classEnrollment.findMany({
    where: { isActive: true },
    select: { studentId: true, classId: true },
  });
  const activeSet = new Set(activeEnrollments.map(e => `${e.studentId}|${e.classId}`));

  // Conjunto de clases con inscripción EXISTENTE (activa o inactiva), para distinguir
  // "eliminada físicamente" de "desactivada".
  const allEnrollments = await prisma.classEnrollment.findMany({
    select: { studentId: true, classId: true, isActive: true },
  });
  const anyEnrollmentSet = new Set(allEnrollments.map(e => `${e.studentId}|${e.classId}`));

  const allTransfers = await prisma.studentTransfer.findMany({ orderBy: { transferredAt: 'asc' } });

  // ============================================================
  // BUG A — duplicados en la misma terna, sin pagos parciales
  // ============================================================
  console.log('\n1. BUG A: duplicados en la misma terna (sin pagos parciales)');

  const tripleGroups = new Map();
  for (const p of allPayments) {
    const key = `${p.studentId}|${p.classId}|${p.periodId}`;
    if (!tripleGroups.has(key)) tripleGroups.set(key, []);
    tripleGroups.get(key).push(p);
  }

  const bugA = [];
  for (const [key, group] of tripleGroups) {
    if (group.length <= 1) continue;

    // Si el grupo contiene un pago parcial, es el flujo legítimo de pago parcial
    // (mensualidad + saldo restante), NO un duplicado.
    const hasPartial = group.some(isPartialPayment);
    if (hasPartial) continue;

    const first = group[0];
    bugA.push({
      studentId: first.studentId,
      studentName: first.student?.name,
      phone: first.student?.phone,
      periodName: first.period?.name,
      classId: first.classId,
      className: first.danceClass?.name,
      sport: first.danceClass?.sport,
      payments: group.map(p => ({
        id: p.id,
        status: p.status,
        expectedAmount: p.expectedAmount,
        paidAmount: p.paidAmount,
        createdAt: p.createdAt,
        notes: p.notes,
      })),
    });
  }

  const bugAStudents = new Set(bugA.map(b => b.studentId));
  const bugAExtra = bugA.reduce((s, b) => s + b.payments.length - 1, 0);
  console.log(`   Grupos con duplicados REALES: ${bugA.length}`);
  console.log(`   Pagos excedentes: ${bugAExtra}`);
  console.log(`   Estudiantes afectados: ${bugAStudents.size}`);

  // ============================================================
  // BUG B — doble cobro por movimiento (origen dejada, destino activa)
  // ============================================================
  console.log('\n2. BUG B: doble cobro por movimiento (origen dejada, destino activa)');

  const byStudentPeriod = new Map();
  for (const p of allPayments) {
    const key = `${p.studentId}|${p.periodId}`;
    if (!byStudentPeriod.has(key)) byStudentPeriod.set(key, []);
    byStudentPeriod.get(key).push(p);
  }

  const transfersByStudent = new Map();
  for (const t of allTransfers) {
    if (!transfersByStudent.has(t.studentId)) transfersByStudent.set(t.studentId, []);
    transfersByStudent.get(t.studentId).push(t);
  }

  const bugB = [];

  for (const [key, group] of byStudentPeriod) {
    const paidPayments = group.filter(p => p.status === 'PAID' || p.status === 'PARTIAL_PAID');
    const pendingPayments = group.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE');
    if (paidPayments.length === 0 || pendingPayments.length === 0) continue;

    const studentId = group[0].studentId;
    const periodName = group[0].period?.name;
    const transfers = transfersByStudent.get(studentId) || [];

    const chainMap = new Map();
    for (const t of transfers) {
      const edges = chainMap.get(t.fromClassId) ?? [];
      edges.push({ toClassId: t.toClassId });
      chainMap.set(t.fromClassId, edges);
    }

    for (const pending of pendingPayments) {
      const pendingSport = pending.danceClass?.sport;
      if (!pendingSport) continue;

      // La clase DESTINO debe estar ACTIVA (el estudiante está inscrito ahí ahora).
      const pendingActive = activeSet.has(`${studentId}|${pending.classId}`);
      if (!pendingActive) continue;

      for (const paid of paidPayments) {
        if (paid.classId === pending.classId) continue;
        if (paid.danceClass?.sport !== pendingSport) continue;

        // La clase ORIGEN debe estar INACTIVA o ELIMINADA: el estudiante la dejó.
        // Si sigue activa → matrícula simultánea legítima → no es bug.
        const paidActive = activeSet.has(`${studentId}|${paid.classId}`);
        if (paidActive) continue;

        // ¿La cadena de transferencias cubre origen → destino?
        if (hasPath(paid.classId, pending.classId, chainMap)) continue;

        const originState = anyEnrollmentSet.has(`${studentId}|${paid.classId}`)
          ? 'INACTIVA'
          : 'ELIMINADA';

        bugB.push({
          studentId,
          studentName: group[0].student?.name,
          phone: group[0].student?.phone,
          periodName,
          paid: {
            id: paid.id,
            classId: paid.classId,
            className: paid.danceClass?.name,
            sport: paid.danceClass?.sport,
            status: paid.status,
            expectedAmount: paid.expectedAmount,
          },
          pending: {
            id: pending.id,
            classId: pending.classId,
            className: pending.danceClass?.name,
            sport: pending.danceClass?.sport,
            status: pending.status,
            expectedAmount: pending.expectedAmount,
            createdAt: pending.createdAt,
          },
          originState,
          destinationState: 'ACTIVA',
        });
        break;
      }
    }
  }

  const bugBStudents = new Set(bugB.map(b => b.studentId));
  const bugBAmount = bugB.reduce((s, b) => s + b.pending.expectedAmount, 0);
  console.log(`   Casos: ${bugB.length}`);
  console.log(`   Estudiantes afectados: ${bugBStudents.size}`);
  console.log(`   Monto pendiente erróneo: $${bugBAmount.toLocaleString('es-CO')}`);

  // ============================================================
  // Reporte
  // ============================================================
  console.log('\n' + '='.repeat(110));
  console.log('REPORTE CONSOLIDADO');
  console.log('='.repeat(110));

  console.log(`\n🔴 BUG A (duplicados misma terna, sin parciales): ${bugA.length} grupos · ${bugAExtra} pagos extra · ${bugAStudents.size} estudiantes`);
  for (const b of bugA) {
    console.log(`\n   ${b.studentName} (${b.studentId})`);
    console.log(`   ${b.periodName} | ${b.className} (ClassId=${b.classId}, ${b.sport}) → ${b.payments.length} mensualidades completas:`);
    for (const p of b.payments) {
      console.log(`      #${p.id} ${p.status} $${p.expectedAmount.toLocaleString()} (pagado $${(p.paidAmount ?? 0).toLocaleString()}) creado ${fmt(p.createdAt)}`);
    }
  }

  console.log(`\n🔴 BUG B (doble cobro por movimiento): ${bugB.length} casos · ${bugBStudents.size} estudiantes · $${bugBAmount.toLocaleString('es-CO')}`);
  const byStudentB = new Map();
  for (const b of bugB) {
    if (!byStudentB.has(b.studentId)) byStudentB.set(b.studentId, []);
    byStudentB.get(b.studentId).push(b);
  }
  for (const [sid, items] of byStudentB) {
    const name = items[0].studentName;
    console.log(`\n   ┌─ ${sid} — ${name} (${items[0].phone})`);
    for (const b of items) {
      console.log(`   │  ${b.periodName}:`);
      console.log(`   │     ✅ PAID #${b.paid.id} | ${b.paid.sport} | ${b.paid.className} (ClassId=${b.paid.classId}) [${b.originState}]`);
      console.log(`   │     ❌ PENDING #${b.pending.id} | ${b.pending.sport} | ${b.pending.className} (ClassId=${b.pending.classId}) [${b.destinationState}] $${b.pending.expectedAmount.toLocaleString()}`);
    }
    console.log(`   └─`);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    notes: 'matricula simultanea valida; bug A descarta pagos parciales; bug B exige origen dejada + destino activa',
    bugA: bugA,
    bugB: bugB,
  };
  const outputPath = path.join(__dirname, '..', 'double-charge-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  console.log(`\n📄 Payload: ${outputPath}`);

  console.log('\n' + '='.repeat(110));
  console.log('FIN');
  console.log('='.repeat(110));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
