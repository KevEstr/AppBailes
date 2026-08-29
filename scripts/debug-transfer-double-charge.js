/**
 * Script de diagnóstico para el bug de doble cobro / cambio de corte al transferir estudiante.
 * 
 * Estudiante: Valery Garzon Quiroz (ID: 1022155981)
 * 
 * Hipótesis a verificar:
 * 1. ¿Se generaron pagos duplicados para el mismo período en clases diferentes?
 * 2. ¿El día de corte se propagó correctamente en la transferencia?
 * 3. ¿La transferencia ocurrió en un mes distinto al período de pago, haciendo que
 *    generateMonthlyPayments no detecte la transferencia dentro del período?
 * 4. ¿El cleanup de la API de transferencia eliminó/falló en eliminar pagos PENDING de la clase origen?
 * 5. ¿Hay inconsistencia entre paymentCutoffDay almacenado vs el que se usa en los pagos?
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const STUDENT_ID = '1022155981';

function fmt(d) {
  if (!d) return 'NULL';
  d = new Date(d);
  // Convertir a hora Colombia (UTC-5)
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
  console.log('DIAGNÓSTICO: Bug de doble cobro tras transferencia de grupo');
  console.log('Estudiante ID:', STUDENT_ID);
  console.log('='.repeat(100));

  // ============================================================
  // 1. DATOS DEL ESTUDIANTE
  // ============================================================
  console.log('\n📋 1. DATOS DEL ESTUDIANTE');
  const student = await prisma.student.findUnique({
    where: { id: STUDENT_ID },
    include: {
      enrollmentData: true,
    }
  });
  if (!student) {
    console.log('❌ Estudiante no encontrado');
    return;
  }
  console.log(`   Nombre: ${student.name}`);
  console.log(`   Teléfono: ${student.phone}`);
  console.log(`   Activo: ${student.isActive}`);
  console.log(`   Tiene deuda: ${student.hasDebt}`);
  console.log(`   Creado: ${fmt(student.createdAt)}`);
  console.log(`   EnrollmentData.paymentCutoffDay: ${student.enrollmentData?.paymentCutoffDay ?? 'NULL'}`);
  console.log(`   EnrollmentData.monthlyFee: ${student.enrollmentData?.monthlyFee ?? 'NULL'}`);

  // ============================================================
  // 2. INSCRIPCIONES (ACTIVAS E INACTIVAS)
  // ============================================================
  console.log('\n📋 2. INSCRIPCIONES A CLASES');
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentId: STUDENT_ID },
    include: {
      danceClass: {
        include: { trainer: { select: { id: true, name: true } } }
      }
    },
    orderBy: { enrolledAt: 'asc' }
  });

  for (const e of enrollments) {
    console.log(`   [${e.isActive ? 'ACTIVA' : 'INACTIVA'}] ID=${e.id} ClassId=${e.classId} "${e.danceClass.name}"`);
    console.log(`      Trainer: ${e.danceClass.trainer?.name ?? 'N/A'}`);
    console.log(`      Sport: ${e.danceClass.sport}`);
    console.log(`      paymentCutoffDay: ${e.paymentCutoffDay ?? 'NULL (→ default 30 en DB, 15 en resolveCutoffDay)'}`);
    console.log(`      monthlyFee: ${e.monthlyFee ?? 'NULL'}`);
    console.log(`      enrolledAt: ${fmt(e.enrolledAt)}`);
    console.log(`      createdAt: ${fmt(e.createdAt)}`);
    console.log(`      updatedAt: ${fmt(e.updatedAt)}`);
  }

  // ============================================================
  // 3. HISTORIAL DE TRANSFERENCIAS
  // ============================================================
  console.log('\n📋 3. HISTORIAL DE TRANSFERENCIAS');
  const transfers = await prisma.studentTransfer.findMany({
    where: { studentId: STUDENT_ID },
    include: {
      fromClass: { select: { id: true, name: true, trainer: { select: { name: true } } } },
      toClass: { select: { id: true, name: true, trainer: { select: { name: true } } } },
    },
    orderBy: { transferredAt: 'asc' }
  });

  if (transfers.length === 0) {
    console.log('   ⚠️  No hay transferencias registradas');
  }
  for (const t of transfers) {
    console.log(`   Transfer #${t.id}: ClassId ${t.fromClassId} → ${t.toClassId}`);
    console.log(`      De: "${t.fromClass.name}" (trainer: ${t.fromClass.trainer?.name})`);
    console.log(`      A:  "${t.toClass.name}" (trainer: ${t.toClass.trainer?.name})`);
    console.log(`      Fecha transferencia: ${fmt(t.transferredAt)}`);
    console.log(`      Razón: ${t.reason || 'N/A'}`);
  }

  // ============================================================
  // 4. PERÍODOS DE PAGO ACTIVOS
  // ============================================================
  console.log('\n📋 4. PERÍODOS DE PAGO ACTIVOS');
  const periods = await prisma.paymentPeriod.findMany({
    where: { isActive: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 6,
  });
  for (const p of periods) {
    console.log(`   Period #${p.id}: ${p.name} (${p.year}-${p.month.toString().padStart(2, '0')})`);
    console.log(`      isActive: ${p.isActive}`);
  }

  // ============================================================
  // 5. TODOS LOS PAGOS MENSUALES DE LA ESTUDIANTE
  // ============================================================
  console.log('\n📋 5. PAGOS MENSUALES DE LA ESTUDIANTE');
  const payments = await prisma.monthlyPayment.findMany({
    where: { studentId: STUDENT_ID },
    include: {
      period: true,
      danceClass: {
        include: { trainer: { select: { name: true } } }
      },
      receipts: true,
      feeConfig: true,
    },
    orderBy: [
      { period: { year: 'desc' } },
      { period: { month: 'desc' } },
      { createdAt: 'asc' }
    ],
  });

  if (payments.length === 0) {
    console.log('   ⚠️  No hay pagos registrados');
  }

  // Agrupar por período y clase para detectar duplicados
  const byTriple = new Map();
  for (const p of payments) {
    const key = `${p.studentId}|${p.classId}|${p.periodId}`;
    if (!byTriple.has(key)) byTriple.set(key, []);
    byTriple.get(key).push(p);
  }

  // Mostrar duplicados primero
  const dupes = [];
  for (const [key, group] of byTriple) {
    if (group.length > 1) dupes.push({ key, group });
  }

  if (dupes.length > 0) {
    console.log('\n   🚨 PAGOS DUPLICADOS (misma terna studentId|classId|periodId):');
    for (const { key, group } of dupes) {
      console.log(`   ═══ Duplicado: ${key} (${group.length} registros) ═══`);
      for (const p of group) {
        console.log(`      Payment #${p.id} | Class "${p.danceClass?.name}" | Period "${p.period?.name}"`);
        console.log(`         Status: ${p.status} | Expected: $${p.expectedAmount} | Paid: $${p.paidAmount ?? 0}`);
        console.log(`         dueDate: ${fmtDate(p.dueDate)} | paymentDate: ${fmt(p.paymentDate)}`);
        console.log(`         feeConfigId: ${p.feeConfigId} | cutoffDay (en nota): extraído más abajo`);
        console.log(`         Creado: ${fmt(p.createdAt)}`);
        if (p.receipts.length > 0) {
          for (const r of p.receipts) {
            console.log(`            📄 Recibo #${r.id}: $${r.amount} | ${r.paymentMethod} | ${fmt(r.createdAt)}`);
          }
        }
      }
    }
  }

  // Luego mostrar todos cronológicamente
  console.log('\n   Todos los pagos (orden cronológico):');
  console.log('   ' + '-'.repeat(95));
  console.log('   ID    | Clase (Trainer)                          | Período         | Status        | DueDate    | Expected    | Paid       | Creado');
  console.log('   ' + '-'.repeat(95));
  for (const p of payments) {
    const className = p.danceClass 
      ? `${p.danceClass.name.substring(0, 30)} (${p.danceClass.trainer?.name?.substring(0, 12) || 'N/A'})`
      : `ClassId=${p.classId}`;
    console.log(
      `   ${String(p.id).padEnd(6)} | ${className.padEnd(42)} | ${(p.period?.name || 'N/A').padEnd(15)} | ${p.status.padEnd(13)} | ${fmtDate(p.dueDate).padEnd(10)} | $${String(p.expectedAmount).padEnd(10)} | $${String(p.paidAmount ?? 0).padEnd(9)} | ${fmt(p.createdAt)}`
    );
    if (p.notes) {
      // Extraer día de corte de las notas
      const corteMatch = p.notes.match(/Corte día (\d+)/);
      if (corteMatch) {
        console.log(`         📝 Nota: Corte día ${corteMatch[1]}`);
      }
    }
  }

  // ============================================================
  // 6. ANÁLISIS DE LA CADENA DE TRANSFERENCIA Y CORTES
  // ============================================================
  console.log('\n📋 6. ANÁLISIS DE CORTES Y CADENA DE TRANSFERENCIA');

  // Revisar la cadena: para cada pago, ver qué corte se resolvió
  const { resolveCutoffDay } = require('../lib/payment-utils');
  
  for (const p of payments) {
    if (!p.classId) continue;
    const cutoff = await resolveCutoffDay(p.studentId, p.classId);
    console.log(`   Payment #${p.id} (ClassId=${p.classId}, "${p.danceClass?.name}"):`);
    console.log(`      resolveCutoffDay → ${cutoff}`);
    
    // Comparar con lo que hay en la inscripción
    const enrollment = enrollments.find(e => e.classId === p.classId && e.isActive);
    const storedCutoff = enrollment?.paymentCutoffDay;
    console.log(`      enrollment.paymentCutoffDay → ${storedCutoff ?? 'NULL'}`);
    
    // Comparar con lo que generateMonthlyPayments usaría
    const genCutoff = storedCutoff ?? 30;
    console.log(`      generateMonthlyPayments usaría → ${genCutoff}`);
    
    // Extraer de las notas
    const corteMatch = p.notes?.match(/Corte día (\d+)/);
    const noteCutoff = corteMatch ? parseInt(corteMatch[1]) : null;
    console.log(`      Notas del pago indican corte → ${noteCutoff ?? 'N/A'}`);
    
    if (cutoff !== genCutoff && storedCutoff === null) {
      console.log(`      ⚠️ INCONSISTENCIA: resolveCutoffDay(${cutoff}) ≠ generateMonthlyPayments(${genCutoff})`);
    }
  }

  // ============================================================
  // 7. RECIBOS
  // ============================================================
  console.log('\n📋 7. RECIBOS');
  const receipts = await prisma.receipt.findMany({
    where: { studentId: STUDENT_ID },
    include: {
      monthlyPayment: {
        select: { id: true, classId: true, periodId: true, status: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  for (const r of receipts) {
    console.log(`   Recibo #${r.id}: $${r.amount} | ${r.paymentMethod} | ${fmt(r.createdAt)}`);
    console.log(`      monthlyPaymentId: ${r.monthlyPaymentId} (status: ${r.monthlyPayment?.status})`);
    console.log(`      Concepto: ${r.concept || '(vacío)'}`);
  }

  // ============================================================
  // 8. RESUMEN DEL PROBLEMA
  // ============================================================
  console.log('\n📋 8. RESUMEN Y ANÁLISIS');

  // Verificar pagos duplicados para Julio 2026
  const julyPeriods = periods.filter(p => p.year === 2026 && p.month === 7);
  if (julyPeriods.length > 0) {
    const julyPayments = payments.filter(p => p.periodId === julyPeriods[0].id);
    console.log(`\n   Pagos en Julio 2026: ${julyPayments.length}`);
    for (const p of julyPayments) {
      console.log(`      #${p.id}: ClassId=${p.classId} "${p.danceClass?.name}" | Status=${p.status} | $${p.expectedAmount} | Creado=${fmt(p.createdAt)}`);
    }
    
    if (julyPayments.length > 1) {
      console.log('   🚨 ALERTA: Hay más de un pago para Julio 2026 (posible duplicado)');
    }
  }

  // Verificar la consistencia del corte
  console.log('\n   Verificación de consistencia de corte:');
  const activeEnrollment = enrollments.find(e => e.isActive);
  const inactiveEnrollments = enrollments.filter(e => !e.isActive);
  
  if (activeEnrollment) {
    console.log(`   Clase activa: "${activeEnrollment.danceClass.name}"`);
    console.log(`      paymentCutoffDay almacenado: ${activeEnrollment.paymentCutoffDay ?? 'NULL'}`);
    const resolvedCutoff = activeEnrollment.paymentCutoffDay 
      ? activeEnrollment.paymentCutoffDay 
      : await resolveCutoffDay(STUDENT_ID, activeEnrollment.classId);
    console.log(`      Corte esperado (según transferencia): ${resolvedCutoff}`);
  }
  
  for (const ie of inactiveEnrollments) {
    console.log(`   Clase inactiva: "${ie.danceClass.name}"`);
    console.log(`      paymentCutoffDay almacenado: ${ie.paymentCutoffDay ?? 'NULL'}`);
    
    // Ver si esta clase es origen de una transferencia
    const transferOut = transfers.find(t => t.fromClassId === ie.classId);
    if (transferOut) {
      console.log(`      Fue transferida a: "${transferOut.toClass.name}" el ${fmt(transferOut.transferredAt)}`);
      // Verificar si el destino heredó el corte correctamente
      const destEnrollment = enrollments.find(e => e.classId === transferOut.toClassId);
      if (destEnrollment) {
        console.log(`      Corte en destino: ${destEnrollment.paymentCutoffDay ?? 'NULL'}`);
        if (ie.paymentCutoffDay !== destEnrollment.paymentCutoffDay) {
          console.log(`      ⚠️ El corte NO se heredó correctamente: origen=${ie.paymentCutoffDay}, destino=${destEnrollment.paymentCutoffDay}`);
        } else {
          console.log(`      ✅ Corte heredado correctamente: ${ie.paymentCutoffDay}`);
        }
      }
    }
  }

  // Verificar la lógica de generateMonthlyPayments: ¿detectaría el pago de la clase vieja?
  console.log('\n   Simulación de generateMonthlyPayments para detectar duplicados:');
  if (transfers.length > 0) {
    for (const t of transfers) {
      // Para cada período con pagos, ver si la transferencia está DENTRO del período
      const periodIds = [...new Set(payments.map(p => p.periodId))];
      for (const pid of periodIds) {
        const period = await prisma.paymentPeriod.findUnique({ where: { id: pid } });
        if (!period) continue;
        
        const periodStart = new Date(period.year, period.month - 1, 1);
        const periodEnd = new Date(period.year, period.month, 1);
        const transferDate = new Date(t.transferredAt);
        
        const isWithinPeriod = transferDate >= periodStart && transferDate < periodEnd;
        
        // Contar pagos para cada clase en este período
        const paymentsInPeriod = payments.filter(p => p.periodId === pid);
        const paymentsInFromClass = paymentsInPeriod.filter(p => p.classId === t.fromClassId);
        const paymentsInToClass = paymentsInPeriod.filter(p => p.classId === t.toClassId);
        
        if (paymentsInFromClass.length > 0 || paymentsInToClass.length > 0) {
          console.log(`   Transfer #${t.id}: ${t.fromClassId}→${t.toClassId} (${fmt(transferDate)})`);
          console.log(`      Período ${period.name}: transferencia ${isWithinPeriod ? 'DENTRO ✅' : 'FUERA ❌'} del período`);
          console.log(`      Pagos en clase origen (${t.fromClassId}): ${paymentsInFromClass.length}`);
          for (const p of paymentsInFromClass) {
            console.log(`         #${p.id}: ${p.status} $${p.expectedAmount}`);
          }
          console.log(`      Pagos en clase destino (${t.toClassId}): ${paymentsInToClass.length}`);
          for (const p of paymentsInToClass) {
            console.log(`         #${p.id}: ${p.status} $${p.expectedAmount}`);
          }
          
          // Si la transferencia no está dentro del período, generateMonthlyPayments
          // NO detectaría la transferencia inmediata y caería en el else (cadena)
          if (!isWithinPeriod && paymentsInFromClass.some(p => p.status === 'PAID') && paymentsInToClass.length > 0) {
            console.log(`      🚨 POSIBLE BUG: Transferencia fuera del período, pero hay PAID en origen y pagos en destino.`);
            console.log(`         El chain-check debería detectarlo, pero verifica si coversEnrollmentByTransferChain funciona.`);
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(100));
  console.log('FIN DEL DIAGNÓSTICO');
  console.log('='.repeat(100));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());