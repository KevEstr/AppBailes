/**
 * Corrección de pagos duplicados — dry-run por defecto.
 *
 * Uso:
 *   node scripts/fix-double-charge.js            → dry-run (no borra nada)
 *   node scripts/fix-double-charge.js --apply    → borra de verdad
 *
 * Borra SOLO pagos PENDING/OVERDUE que son un cobro duplicado:
 *
 *   BUG A — misma terna (studentId, classId, periodId) con mensualidad completa
 *           repetida: conserva el PAID/PARTIAL_PAID y borra los PENDING/OVERDUE
 *           sobrantes. Se descarta si el grupo contiene un pago parcial.
 *
 *   BUG B — doble cobro por movimiento: estudiante pagó (PAID) en una clase que dejó
 *           (INACTIVA/ELIMINADA) y tiene un PENDING/OVERDUE en la clase activa de
 *           destino, mismo deporte, sin cadena de transferencia que las conecte.
 *           Borra el PENDING/OVERDUE de la clase destino.
 *
 * Seguridad:
 *   - Nunca borra PAID/PARTIAL_PAID.
 *   - Nunca borra pagos con notas de pago parcial/saldo restante.
 *   - Verifica recibos asociados: si un pago a borrar tiene recibo, se marca y se
 *     omite (requiere revisión manual).
 *   - Reporta los PaymentForm que se eliminarán en cascada (onDelete: Cascade).
 *   - En --apply, re-verifica el status justo antes de borrar (idempotente).
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

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

const isDeletable = (p) => p.status === 'PENDING' || p.status === 'OVERDUE';

async function main() {
  console.log('='.repeat(110));
  console.log(`CORRECCIÓN DE DOBLE COBRO — ${APPLY ? 'MODO APLICAR (borra de verdad)' : 'MODO DRY-RUN (no borra nada)'}`);
  console.log('='.repeat(110));

  const allPayments = await prisma.monthlyPayment.findMany({
    include: {
      student: { select: { id: true, name: true, phone: true } },
      period: true,
      danceClass: { select: { id: true, name: true, sport: true } },
    },
    orderBy: [{ periodId: 'asc' }, { id: 'asc' }],
  });

  const activeEnrollments = await prisma.classEnrollment.findMany({
    where: { isActive: true },
    select: { studentId: true, classId: true },
  });
  const activeSet = new Set(activeEnrollments.map(e => `${e.studentId}|${e.classId}`));

  const allEnrollments = await prisma.classEnrollment.findMany({
    select: { studentId: true, classId: true, enrolledAt: true },
  });
  const anyEnrollmentSet = new Set(allEnrollments.map(e => `${e.studentId}|${e.classId}`));
  // Fecha de inscripción en cada clase, para detectar solapamiento temporal (mes de transición).
  const enrolledAtMap = new Map(
    allEnrollments.map(e => [`${e.studentId}|${e.classId}`, e.enrolledAt])
  );

  const allTransfers = await prisma.studentTransfer.findMany({ orderBy: { transferredAt: 'asc' } });

  // ============================================================
  // Recolectar candidatos a borrar
  // ============================================================
  const toDelete = []; // { id, studentId, studentName, periodName, classId, className, sport, status, expectedAmount, reason, createdAt }

  // ---- BUG A: misma terna, mensualidad completa repetida ----
  const tripleGroups = new Map();
  for (const p of allPayments) {
    const key = `${p.studentId}|${p.classId}|${p.periodId}`;
    if (!tripleGroups.has(key)) tripleGroups.set(key, []);
    tripleGroups.get(key).push(p);
  }

  for (const [key, group] of tripleGroups) {
    if (group.length <= 1) continue;
    if (group.some(isPartialPayment)) continue; // flujo legítimo de parcial

    // Solo se corrige si existe un PAID/PARTIAL_PAID que resuelve la terna.
    const paid = group.find(p => p.status === 'PAID' || p.status === 'PARTIAL_PAID');
    if (!paid) continue;

    const extras = group.filter(p => p.id !== paid.id && isDeletable(p));
    for (const p of extras) {
      toDelete.push({
        id: p.id,
        studentId: p.studentId,
        studentName: p.student?.name,
        periodName: p.period?.name,
        classId: p.classId,
        className: p.danceClass?.name,
        sport: p.danceClass?.sport,
        status: p.status,
        expectedAmount: p.expectedAmount,
        createdAt: p.createdAt,
        review: false,
        reason: `BUG A: mensualidad completa duplicada en misma terna (conserva #${paid.id} ${paid.status})`,
      });
    }
  }

  // ---- BUG B: doble cobro por movimiento ----
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

  const seenIds = new Set();
  for (const [key, group] of byStudentPeriod) {
    const paidPayments = group.filter(p => p.status === 'PAID' || p.status === 'PARTIAL_PAID');
    const pendingPayments = group.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE');
    if (paidPayments.length === 0 || pendingPayments.length === 0) continue;

    const studentId = group[0].studentId;
    const periodName = group[0].period?.name;
    const transfers = transfersByStudent.get(studentId) || [];

    const chainMap = new Map();
    for (const t of transfers) {
      if (t.toClassId == null) continue; // baja, no forma cadena
      const edges = chainMap.get(t.fromClassId) ?? [];
      edges.push({ toClassId: t.toClassId });
      chainMap.set(t.fromClassId, edges);
    }

    for (const pending of pendingPayments) {
      if (isPartialPayment(pending)) continue;
      const pendingSport = pending.danceClass?.sport;
      if (!pendingSport) continue;

      const pendingActive = activeSet.has(`${studentId}|${pending.classId}`);
      if (!pendingActive) continue;

      for (const paid of paidPayments) {
        if (paid.classId === pending.classId) continue;
        if (paid.danceClass?.sport !== pendingSport) continue;

        const paidActive = activeSet.has(`${studentId}|${paid.classId}`);
        if (paidActive) continue; // matrícula simultánea legítima

        if (hasPath(paid.classId, pending.classId, chainMap)) continue;

        if (seenIds.has(pending.id)) continue;
        seenIds.add(pending.id);

        // Validación de solapamiento temporal: ¿el estudiante ya estaba (o se inscribió
        // antes de terminar el período) en la clase nueva? Si es así, el mes es de
        // transición y el caso requiere revisión manual; si se inscribió DESPUÉS de que
        // terminara el período, el cobro es un duplicado inequívoco → seguro de borrar.
        const period = group[0].period;
        const periodEnd = period ? new Date(period.year, period.month, 1) : null;
        const enrolledInDest = enrolledAtMap.get(`${studentId}|${pending.classId}`) || null;
        const isTransition =
          !periodEnd || !enrolledInDest ? true : enrolledInDest < periodEnd;

        toDelete.push({
          id: pending.id,
          studentId,
          studentName: group[0].student?.name,
          periodName,
          classId: pending.classId,
          className: pending.danceClass?.name,
          sport: pending.danceClass?.sport,
          status: pending.status,
          expectedAmount: pending.expectedAmount,
          createdAt: pending.createdAt,
          review: isTransition,
          reason: `BUG B: doble cobro por movimiento (PAID #${paid.id} en clase dejada, PENDING en clase activa sin transferencia)`,
        });
        break;
      }
    }
  }

  // ============================================================
  // Verificaciones de seguridad sobre los candidatos
  // ============================================================
  const ids = toDelete.map(t => t.id);

  const receipts = await prisma.receipt.findMany({
    where: { monthlyPaymentId: { in: ids } },
    select: { id: true, monthlyPaymentId: true, amount: true },
  });
  const receiptByPayment = new Map();
  for (const r of receipts) {
    if (!receiptByPayment.has(r.monthlyPaymentId)) receiptByPayment.set(r.monthlyPaymentId, []);
    receiptByPayment.get(r.monthlyPaymentId).push(r);
  }

  const paymentForms = await prisma.paymentForm.findMany({
    where: { monthlyPaymentId: { in: ids } },
    select: { id: true, monthlyPaymentId: true, status: true },
  });
  const formCountByPayment = new Map();
  for (const f of paymentForms) {
    formCountByPayment.set(f.monthlyPaymentId, (formCountByPayment.get(f.monthlyPaymentId) || 0) + 1);
  }

  // Separar: seguros de borrar vs. requieren revisión (mes de transición) vs. bloqueados (recibo).
  const safe = [];
  const review = [];
  const blocked = [];
  for (const t of toDelete) {
    if (receiptByPayment.has(t.id)) {
      blocked.push({ ...t, receipts: receiptByPayment.get(t.id) });
    } else if (t.review) {
      review.push(t);
    } else {
      safe.push(t);
    }
  }

  const totalSafeAmount = safe.reduce((s, t) => s + t.expectedAmount, 0);
  const totalReviewAmount = review.reduce((s, t) => s + t.expectedAmount, 0);

  // ============================================================
  // Reporte
  // ============================================================
  console.log('\n' + '='.repeat(110));
  console.log('RESUMEN');
  console.log('='.repeat(110));
  console.log(`   Candidatos totales a borrar: ${toDelete.length}`);
  console.log(`   Seguros (sin recibo, sin solapamiento): ${safe.length}`);
  console.log(`   Revisión manual (mes de transición / posible simultaneidad): ${review.length}`);
  console.log(`   Bloqueados (tienen recibo): ${blocked.length}`);
  console.log(`   Monto a borrar automáticamente (seguros): $${totalSafeAmount.toLocaleString('es-CO')}`);
  console.log(`   Monto pendiente de revisión manual: $${totalReviewAmount.toLocaleString('es-CO')}`);
  if (APPLY) {
    console.log('\n   ⚠️  MODO APLICAR: solo se borrarán los pagos SEGUROS.');
  } else {
    console.log('\n   ℹ️  DRY-RUN: no se borró nada. Revisa y vuelve a correr con --apply.');
  }

  if (safe.length > 0) {
    console.log('\n📋 PAGOS A BORRAR (seguros):');
    console.log('   ' + '-'.repeat(104));
    console.log('   ID     | Estudiante                        | Período       | Clase (ClassId)                        | Estado  | Monto     | Formularios');
    console.log('   ' + '-'.repeat(104));
    for (const t of safe) {
      const forms = formCountByPayment.get(t.id) || 0;
      console.log(
        `   ${String(t.id).padEnd(6)} | ${(t.studentName || '?').padEnd(32).slice(0, 32)} | ${t.periodName.padEnd(13)} | ${(t.className || '').slice(0, 36).padEnd(36)} (${t.classId}) | ${t.status.padEnd(8)} | $${String(t.expectedAmount).padEnd(9)} | ${forms}`
      );
    }
    console.log('   ' + '-'.repeat(104));

    console.log('\n📝 MOTIVOS (detalle):');
    for (const t of safe) {
      console.log(`   #${t.id} ${t.studentName} — ${t.periodName}: ${t.reason}`);
    }
  }

  if (review.length > 0) {
    console.log('\n⚠️  REQUIEREN REVISIÓN MANUAL (mes de transición / posible simultaneidad):');
    console.log('   ' + '-'.repeat(104));
    console.log('   ID     | Estudiante                        | Período       | Clase (ClassId)                        | Estado  | Monto');
    console.log('   ' + '-'.repeat(104));
    for (const t of review) {
      console.log(
        `   ${String(t.id).padEnd(6)} | ${(t.studentName || '?').padEnd(32).slice(0, 32)} | ${t.periodName.padEnd(13)} | ${(t.className || '').slice(0, 36).padEnd(36)} (${t.classId}) | ${t.status.padEnd(8)} | $${String(t.expectedAmount).padEnd(9)}`
      );
    }
    console.log('   ' + '-'.repeat(104));
    console.log('\n   Motivo: el estudiante se inscribió en la clase nueva ANTES de que terminara');
    console.log('   el período del cobro (mes de cambio), por lo que pudo asistir a ambas clases.');
    console.log('   Revisa si corresponde cobrar el período en la clase nueva o si es duplicado.');
  }

  if (blocked.length > 0) {
    console.log('\n🚫 BLOQUEADOS (tienen recibo, NO se borrarán):');
    for (const t of blocked) {
      console.log(`   #${t.id} ${t.studentName} — ${t.periodName} — ${t.reason}`);
      for (const r of t.receipts) {
        console.log(`      recibo #${r.id} $${r.amount}`);
      }
    }
  }

  // Escribir plan a JSON
  const plan = {
    generatedAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    summary: {
      totalCandidates: toDelete.length,
      safe: safe.length,
      review: review.length,
      blocked: blocked.length,
      totalSafeAmount,
      totalReviewAmount,
    },
    toDelete: safe.map(t => ({
      id: t.id,
      studentId: t.studentId,
      studentName: t.studentName,
      periodName: t.periodName,
      classId: t.classId,
      className: t.className,
      sport: t.sport,
      status: t.status,
      expectedAmount: t.expectedAmount,
      reason: t.reason,
      paymentFormsToCascade: formCountByPayment.get(t.id) || 0,
    })),
    toReview: review.map(t => ({
      id: t.id,
      studentId: t.studentId,
      studentName: t.studentName,
      periodName: t.periodName,
      classId: t.classId,
      className: t.className,
      sport: t.sport,
      status: t.status,
      expectedAmount: t.expectedAmount,
      reason: t.reason,
    })),
    blocked: blocked,
  };
  const planPath = path.join(__dirname, '..', 'double-charge-fix-plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log(`\n📄 Plan guardado en: ${planPath}`);

  // ============================================================
  // Aplicar (solo con --apply)
  // ============================================================
  if (APPLY && safe.length > 0) {
    const safeIds = safe.map(t => t.id);
    console.log('\n' + '='.repeat(110));
    console.log('APLICANDO BORRADO...');
    console.log('='.repeat(110));

    const result = await prisma.$transaction(async (tx) => {
      // Re-verificar status: solo borra los que sigan PENDING/OVERDUE (idempotente y seguro).
      const deleted = await tx.monthlyPayment.deleteMany({
        where: {
          id: { in: safeIds },
          status: { in: ['PENDING', 'OVERDUE'] },
        },
      });
      return deleted.count;
    });

    console.log(`\n✅ Borrados ${result} pagos (de ${safeIds.length} candidatos).`);
    console.log('   Los recibos asociados (si alguno) quedaron con monthlyPaymentId = null (onDelete SetNull).');
  } else if (APPLY && safe.length === 0) {
    console.log('\n✅ No hay pagos seguros que borrar.');
  }

  console.log('\n' + '='.repeat(110));
  console.log('FIN');
  console.log('='.repeat(110));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
