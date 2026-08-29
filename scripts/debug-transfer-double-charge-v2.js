/**
 * Script de diagnóstico v2 - Investigación profunda del bug de doble cobro.
 * Estudiante: Valery Garzon Quiroz (ID: 1022155981)
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STUDENT_ID = '1022155981';

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
  console.log('='.repeat(100));
  console.log('DIAGNÓSTICO v2 - Análisis profundo');
  console.log('='.repeat(100));

  // ============================================================
  // 1. BUSCAR LA INSCRIPCIÓN FALTANTE DE CARLOS DAVILA (ClassId=32)
  // ============================================================
  console.log('\n📋 1. INSCRIPCIÓN DE CARLOS DAVILA (ClassId=32)');
  
  // Buscar si existe pero quizás fue excluida antes
  const enrollment32 = await prisma.classEnrollment.findFirst({
    where: { studentId: STUDENT_ID, classId: 32 }
  });
  console.log('   Buscando (studentId, classId=32):', enrollment32 ? 'ENCONTRADA' : 'NO ENCONTRADA');
  if (enrollment32) {
    console.log(`   ID: ${enrollment32.id} | isActive: ${enrollment32.isActive}`);
    console.log(`   paymentCutoffDay: ${enrollment32.paymentCutoffDay}`);
    console.log(`   enrolledAt: ${fmt(enrollment32.enrolledAt)}`);
    console.log(`   createdAt: ${fmt(enrollment32.createdAt)}`);
    console.log(`   updatedAt: ${fmt(enrollment32.updatedAt)}`);
  }

  // ============================================================
  // 2. BUSCAR TRANSFERENCIA FALTANTE: Carlos Davila (32) → Antonia Contreras (61)
  // ============================================================
  console.log('\n📋 2. TRANSFERENCIAS DE CARLOS DAVILA (32) A ANTONIA CONTRERAS (61)');
  
  const transfer32to61 = await prisma.studentTransfer.findFirst({
    where: { studentId: STUDENT_ID, fromClassId: 32, toClassId: 61 }
  });
  console.log('   Transferencia 32→61:', transfer32to61 ? 'ENCONTRADA' : 'NO ENCONTRADA');
  if (transfer32to61) {
    console.log(`   ID: ${transfer32to61.id} | transferredAt: ${fmt(transfer32to61.transferredAt)}`);
    console.log(`   Razón: ${transfer32to61.reason || 'N/A'}`);
    console.log(`   transferredBy: ${transfer32to61.transferredBy}`);
  } else {
    // Buscar cualquier transferencia con destino 61
    const anyTransferTo61 = await prisma.studentTransfer.findFirst({
      where: { studentId: STUDENT_ID, toClassId: 61 }
    });
    console.log('   ¿Alguna transferencia hacia clase 61?', anyTransferTo61 ? `SÍ: from=${anyTransferTo61.fromClassId}, id=${anyTransferTo61.id}` : 'NO');
    
    // Buscar cualquier transferencia desde 32
    const anyTransferFrom32 = await prisma.studentTransfer.findFirst({
      where: { studentId: STUDENT_ID, fromClassId: 32 }
    });
    console.log('   ¿Alguna transferencia desde clase 32?', anyTransferFrom32 ? `SÍ: to=${anyTransferFrom32.toClassId}, id=${anyTransferFrom32.id}` : 'NO');
  }

  // ============================================================
  // 3. TODAS LAS TRANSFERENCIAS (sin filtrar campos)
  // ============================================================
  console.log('\n📋 3. TODAS LAS TRANSFERENCIAS (RAW)');
  const allTransfers = await prisma.studentTransfer.findMany({
    where: { studentId: STUDENT_ID },
    orderBy: { transferredAt: 'asc' }
  });
  for (const t of allTransfers) {
    console.log(`   #${t.id}: ${t.fromClassId}→${t.toClassId} | ${fmt(t.transferredAt)} | by userId=${t.transferredBy} | reason: ${t.reason || 'N/A'}`);
  }

  // ============================================================
  // 4. DATOS DE LAS CLASES INVOLUCRADAS
  // ============================================================
  console.log('\n📋 4. CLASES INVOLUCRADAS');
  const classIds = [53, 32, 61];
  for (const cid of classIds) {
    const cls = await prisma.danceClass.findUnique({
      where: { id: cid },
      include: { trainer: { select: { name: true } } }
    });
    if (cls) {
      console.log(`   ClassId=${cid}: "${cls.name}" | trainer: ${cls.trainer?.name} | sport: ${cls.sport} | active: ${cls.isActive}`);
    } else {
      console.log(`   ClassId=${cid}: NO EXISTE`);
    }
  }

  // ============================================================
  // 5. ANÁLISIS DETALLADO DE PAGOS DUPLICADOS (Julio y Junio 2026)
  // ============================================================
  console.log('\n📋 5. ANÁLISIS DE PAGOS DUPLICADOS POR PERÍODO');

  const periods = await prisma.paymentPeriod.findMany({
    where: { year: 2026, month: { in: [6, 7, 8] } },
    orderBy: { month: 'asc' }
  });

  for (const period of periods) {
    console.log(`\n   ═══ Período: ${period.name} (id=${period.id}) ═══`);
    
    const paymentsInPeriod = await prisma.monthlyPayment.findMany({
      where: { studentId: STUDENT_ID, periodId: period.id },
      include: {
        danceClass: { include: { trainer: { select: { name: true } } } },
        receipts: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    // Verificar la inscripción activa al momento de cada pago
    for (const p of paymentsInPeriod) {
      console.log(`\n      Payment #${p.id}:`);
      console.log(`         Clase: "${p.danceClass?.name}" (ClassId=${p.classId}, trainer: ${p.danceClass?.trainer?.name})`);
      console.log(`         Status: ${p.status} | Expected: $${p.expectedAmount} | Paid: $${p.paidAmount ?? 0}`);
      console.log(`         dueDate: ${fmtDate(p.dueDate)} | paymentDate: ${fmt(p.paymentDate)}`);
      console.log(`         Creado: ${fmt(p.createdAt)} | Actualizado: ${fmt(p.updatedAt)}`);
      console.log(`         feeConfigId: ${p.feeConfigId}`);
      console.log(`         Notas: ${p.notes || '(vacío)'}`);
      
      // Extraer corte de las notas
      const corteMatch = p.notes?.match(/Corte día (\d+)/);
      if (corteMatch) {
        console.log(`         📌 Corte según nota: ${corteMatch[1]}`);
      }

      // ¿Qué inscripción estaba activa cuando se creó este pago?
      // Buscar inscripciones cuyo enrolledAt <= payment.createdAt
      const enrollmentsAtTime = await prisma.classEnrollment.findMany({
        where: {
          studentId: STUDENT_ID,
          classId: p.classId,
          enrolledAt: { lte: p.createdAt }
        },
        orderBy: { enrolledAt: 'desc' }
      });
      
      if (enrollmentsAtTime.length > 0) {
        const e = enrollmentsAtTime[0];
        console.log(`         Inscripción al crear pago: ID=${e.id}, isActive=${e.isActive}, cutoff=${e.paymentCutoffDay}, enrolledAt=${fmt(e.enrolledAt)}`);
      } else {
        console.log(`         ⚠️  No había inscripción para ClassId=${p.classId} al crear este pago (${fmt(p.createdAt)})`);
      }

      // Recibos asociados
      if (p.receipts.length > 0) {
        for (const r of p.receipts) {
          console.log(`         📄 Recibo #${r.id}: $${r.amount} | ${r.paymentMethod} | ${fmt(r.createdAt)}`);
        }
      }
    }

    // Verificar duplicados
    if (paymentsInPeriod.length > 1) {
      const classIdsInPeriod = paymentsInPeriod.map(p => p.classId);
      const uniqueClassIds = [...new Set(classIdsInPeriod)];
      console.log(`\n      🚨 ${paymentsInPeriod.length} pagos en ${uniqueClassIds.length} clases distintas`);
      
      // ¿Hay un pago PAID en una clase y PENDING en otra?
      const paidPayments = paymentsInPeriod.filter(p => p.status === 'PAID' || p.status === 'PARTIAL_PAID');
      const pendingPayments = paymentsInPeriod.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE');
      
      if (paidPayments.length > 0 && pendingPayments.length > 0) {
        console.log('      🚨 ESCENARIO DE DOBLE COBRO: Hay pagos PAID y PENDING para el mismo período');
        for (const pp of paidPayments) {
          console.log(`         PAID: #${pp.id} en clase ${pp.classId} "${pp.danceClass?.name}"`);
        }
        for (const pp of pendingPayments) {
          console.log(`         PENDING: #${pp.id} en clase ${pp.classId} "${pp.danceClass?.name}"`);
        }
      }
    }
  }

  // ============================================================
  // 6. RECONSTRUCCIÓN CRONOLÓGICA DEL FLUJO
  // ============================================================
  console.log('\n📋 6. RECONSTRUCCIÓN CRONOLÓGICA');

  // Obtener todos los eventos ordenados por fecha
  const events = [];

  // Pagos
  const allPayments = await prisma.monthlyPayment.findMany({
    where: { studentId: STUDENT_ID },
    include: { period: true, danceClass: { select: { name: true } } },
    orderBy: { createdAt: 'asc' }
  });
  for (const p of allPayments) {
    events.push({
      type: 'PAYMENT_CREATED',
      date: p.createdAt,
      desc: `Pago #${p.id}: ${p.status} | ${p.period?.name} | ${p.danceClass?.name} (ClassId=${p.classId}) | $${p.expectedAmount} | cutoff ${p.notes?.match(/Corte día (\d+)/)?.[1] || '?'}`
    });
    if (p.paymentDate) {
      events.push({
        type: 'PAYMENT_MARKED_PAID',
        date: p.paymentDate,
        desc: `Pago #${p.id} marcado como ${p.status}`
      });
    }
  }

  // Transferencias
  for (const t of allTransfers) {
    events.push({
      type: 'TRANSFER',
      date: t.transferredAt,
      desc: `Transferencia #${t.id}: ClassId ${t.fromClassId}→${t.toClassId} | "${t.reason || 'N/A'}"`
    });
  }

  // Inscripciones
  const allEnrollments = await prisma.classEnrollment.findMany({
    where: { studentId: STUDENT_ID },
    include: { danceClass: { select: { name: true } } },
    orderBy: { enrolledAt: 'asc' }
  });
  for (const e of allEnrollments) {
    events.push({
      type: 'ENROLLMENT',
      date: e.enrolledAt,
      desc: `Inscripción #${e.id}: ${e.isActive ? 'ACTIVA' : 'INACTIVA'} | ${e.danceClass.name} (ClassId=${e.classId}) | cutoff=${e.paymentCutoffDay}`
    });
    if (e.updatedAt && e.updatedAt.getTime() !== e.createdAt.getTime()) {
      events.push({
        type: 'ENROLLMENT_UPDATED',
        date: e.updatedAt,
        desc: `Inscripción #${e.id} actualizada: isActive=${e.isActive}, cutoff=${e.paymentCutoffDay}`
      });
    }
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  console.log('\n   Línea de tiempo:');
  for (const e of events) {
    console.log(`   ${fmt(e.date)} | ${e.type.padEnd(20)} | ${e.desc}`);
  }

  // ============================================================
  // 7. ANÁLISIS DEL CORTE INCONSISTENTE (pago #8915 con corte 30)
  // ============================================================
  console.log('\n📋 7. ANÁLISIS DEL CORTE INCONSISTENTE (Pago #8915 - corte 30)');
  
  const payment8915 = await prisma.monthlyPayment.findUnique({
    where: { id: 8915 },
    include: { period: true, danceClass: true }
  });
  
  if (payment8915) {
    console.log(`   Pago #8915: creado ${fmt(payment8915.createdAt)}`);
    console.log(`   Período: ${payment8915.period?.name} (año=${payment8915.period?.year}, mes=${payment8915.period?.month})`);
    console.log(`   Clase: ${payment8915.danceClass?.name} (ClassId=${payment8915.classId})`);
    console.log(`   dueDate: ${fmtDate(payment8915.dueDate)}`);
    
    // ¿Qué inscripción estaba activa cuando se creó este pago?
    const enrollmentAtCreation = await prisma.classEnrollment.findFirst({
      where: {
        studentId: STUDENT_ID,
        classId: payment8915.classId,
        enrolledAt: { lte: payment8915.createdAt }
      },
      orderBy: { enrolledAt: 'desc' }
    });
    
    if (enrollmentAtCreation) {
      console.log(`   Inscripción al crear pago #8915:`);
      console.log(`      ID=${enrollmentAtCreation.id}, isActive=${enrollmentAtCreation.isActive}`);
      console.log(`      paymentCutoffDay=${enrollmentAtCreation.paymentCutoffDay ?? 'NULL'}`);
      console.log(`      enrolledAt=${fmt(enrollmentAtCreation.enrolledAt)}`);
      
      if (enrollmentAtCreation.paymentCutoffDay === null) {
        console.log(`      ⚠️  paymentCutoffDay era NULL → generateMonthlyPayments usó ?? 30`);
      }
    } else {
      console.log(`   ⚠️  No se encontró inscripción para ClassId=${payment8915.classId} al crear el pago`);
      
      // ¿Cuándo se creó la inscripción para esta clase?
      const anyEnrollment = await prisma.classEnrollment.findFirst({
        where: { studentId: STUDENT_ID, classId: payment8915.classId },
        orderBy: { enrolledAt: 'asc' }
      });
      if (anyEnrollment) {
        console.log(`   Primera inscripción en ClassId=${payment8915.classId}:`);
        console.log(`      enrolledAt: ${fmt(anyEnrollment.enrolledAt)} (> pago creado ${fmt(payment8915.createdAt)})`);
      }
    }
  }

  // Comparar con el pago #7691 (corte 15)
  console.log('\n   Comparación: Pago #7691 (creado antes, corte 15)');
  const payment7691 = await prisma.monthlyPayment.findUnique({
    where: { id: 7691 },
    include: { period: true }
  });
  if (payment7691) {
    console.log(`   Pago #7691: creado ${fmt(payment7691.createdAt)}`);
    console.log(`   Período: ${payment7691.period?.name}`);
    console.log(`   Clase: ClassId=${payment7691.classId}`);
    console.log(`   dueDate: ${fmtDate(payment7691.dueDate)}`);
    
    const enrollmentAtCreation = await prisma.classEnrollment.findFirst({
      where: {
        studentId: STUDENT_ID,
        classId: payment7691.classId,
        enrolledAt: { lte: payment7691.createdAt }
      },
      orderBy: { enrolledAt: 'desc' }
    });
    if (enrollmentAtCreation) {
      console.log(`   Inscripción al crear: cutoff=${enrollmentAtCreation.paymentCutoffDay}`);
    }
  }

  // ============================================================
  // 8. SIMULACIÓN: ¿Por qué generateMonthlyPayments creó pagos duplicados?
  // ============================================================
  console.log('\n📋 8. SIMULACIÓN DE generateMonthlyPayments');

  // Para Julio 2026 (periodId=28):
  console.log('\n   Para Julio 2026 (periodId=28):');
  
  const julyPeriod = periods.find(p => p.month === 7);
  if (julyPeriod) {
    const periodStart = new Date(julyPeriod.year, julyPeriod.month - 1, 1); // 2026-07-01
    const periodEnd = new Date(julyPeriod.year, julyPeriod.month, 1);       // 2026-08-01
    
    console.log(`   Ventana de transferencia: ${fmtDate(periodStart)} a ${fmtDate(periodEnd)}`);
    
    // ¿Hay transferencia a ClassId=61 dentro del período?
    const transferInPeriod = await prisma.studentTransfer.findFirst({
      where: {
        studentId: STUDENT_ID,
        toClassId: 61,
        transferredAt: { gte: periodStart, lt: periodEnd }
      }
    });
    console.log(`   ¿Transferencia a clase 61 dentro de Julio? ${transferInPeriod ? `SÍ (#${transferInPeriod.id}, from=${transferInPeriod.fromClassId}, ${fmt(transferInPeriod.transferredAt)})` : 'NO'}`);
    
    // La transferencia fue el 2026-07-30 → DENTRO de Julio
    if (transferInPeriod) {
      console.log(`   → La transferencia SÍ está dentro del período`);
      console.log(`   → generateMonthlyPayments debería buscar PAID en clase origen (${transferInPeriod.fromClassId})`);
      
      const paidInOrigin = await prisma.monthlyPayment.findFirst({
        where: {
          studentId: STUDENT_ID,
          classId: transferInPeriod.fromClassId,
          periodId: julyPeriod.id,
          status: { in: ['PAID', 'PARTIAL_PAID'] }
        }
      });
      
      if (paidInOrigin) {
        console.log(`   → Encontró PAID #${paidInOrigin.id} en clase ${paidInOrigin.classId}`);
        console.log(`   → DEBERÍA eliminar PENDING/OVERDUE en clase destino (61)`);
        console.log(`   → PERO payment #9047 (ClassId=61, PENDING) EXISTE → ¡BUG!`);
        console.log(`   → Posible causa: payment #9047 fue creado DESPUÉS de la última ejecución de generateMonthlyPayments`);
        console.log(`   → Payment #9047 creado: ${fmt(payments.find(p => p.id === 9047)?.createdAt)}`);
      } else {
        const anyPaymentInOrigin = await prisma.monthlyPayment.findFirst({
          where: {
            studentId: STUDENT_ID,
            classId: transferInPeriod.fromClassId,
            periodId: julyPeriod.id,
          }
        });
        if (anyPaymentInOrigin) {
          console.log(`   → Encontró pago #${anyPaymentInOrigin.id} con status=${anyPaymentInOrigin.status} (no PAID/PARTIAL_PAID)`);
          console.log(`   → Flujo: buscaría PENDING en clase vieja para actualizarlo a la nueva`);
        } else {
          console.log(`   → No hay pagos en clase origen → flujo normal de creación`);
        }
      }
    } else {
      // Transferencia fuera del período → cae en else (cadena)
      console.log(`   → Transferencia fuera del período → depende de chain check`);
    }
  }

  // ============================================================
  // 9. ¿Por qué el pago #9047 (Julio 2026, Antonia) fue creado el 2026-08-23?
  // ============================================================
  console.log('\n📋 9. CRONOLOGÍA DEL PAGO #9047');
  
  const payment9047 = await prisma.monthlyPayment.findUnique({
    where: { id: 9047 },
    include: { period: true }
  });
  
  if (payment9047) {
    console.log(`   Pago #9047: creado ${fmt(payment9047.createdAt)}, actualizado ${fmt(payment9047.updatedAt)}`);
    
    // Verificar si el período Julio 2026 todavía estaba activo cuando se creó
    const julyPeriodStatus = await prisma.paymentPeriod.findUnique({
      where: { id: payment9047.periodId }
    });
    console.log(`   Período Julio 2026: isActive=${julyPeriodStatus?.isActive}`);
    
    // ¿generateMonthlyPayments se ejecutó para Julio 2026 después del 23 de agosto?
    // Si generateMonthlyPayments se ejecutó de nuevo y encontró...
    // Escenario A: Transferencia en Julio (2026-07-30)
    //   - Busca transferToThisClass para clase 61 dentro de Julio → la encuentra (2026-07-30)
    //   - Busca PAID en clase origen 32 → encuentra #7691 (PAID)
    //   - Debería eliminar el PENDING en clase 61 → PERO NO LO HIZO
    
    // Escenario B: La inscripción en clase 32 fue desactivada manualmente, no vía transfer
    //   - No hay StudentTransfer 32→61
    //   - Cuando generateMonthlyPayments corre, no encuentra transferToThisClass
    //   - Cae en el else → busca cadena de transferencia
    //   - allPaidInactivePaymentsForPeriod: pagos PAID en clases inactivas
    //   - ¿ClassId=32 está en activeClassIds? NO (la inscripción está inactiva)
    //   - Busca PAID en classId=32 para Julio 2026 → encuentra #7691
    //   - coversEnrollmentByTransferChain(32, 61, chainMap)?
    //   - chainMap tiene: 53 → [32] (from Transfer #129)
    //   - ¿Hay camino de 32 a 61? NO → NO hay transfer de 32 a 61
    //   - → coveredByChain = false → NO elimina PENDING → crea el duplicado

    // Verificar la cadena de transferencia
    console.log(`\n   Cadena de transferencia:`);
    for (const t of allTransfers) {
      console.log(`      ${t.fromClassId} → ${t.toClassId}`);
    }
    
    // ¿Existe cadena de 32 a 61?
    const chainMap = new Map();
    for (const t of allTransfers) {
      const edges = chainMap.get(t.fromClassId) ?? [];
      edges.push({ toClassId: t.toClassId });
      chainMap.set(t.fromClassId, edges);
    }
    
    function hasPath(from, to, visited = new Set()) {
      if (from === to) return false; // mismo classId no cuenta
      if (visited.has(from)) return false;
      visited.add(from);
      const edges = chainMap.get(from) ?? [];
      for (const e of edges) {
        if (e.toClassId === to) return true;
        if (hasPath(e.toClassId, to, visited)) return true;
      }
      return false;
    }
    
    console.log(`   ¿Hay camino 32→61 en cadena? ${hasPath(32, 61) ? 'SÍ' : 'NO'}`);
    
    if (!hasPath(32, 61)) {
      console.log('\n   🎯 RAIZ DEL PROBLEMA:');
      console.log('   No existe registro de transferencia de ClassId=32 (Carlos Davila) a ClassId=61 (Antonia Contreras).');
      console.log('   Sin este registro, generateMonthlyPayments no puede detectar que el pago PAID en clase 32');
      console.log('   cubre la mensualidad en clase 61. Por lo tanto, genera un NUEVO pago PENDING.');
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('FIN DEL DIAGNÓSTICO v2');
  console.log('='.repeat(100));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());