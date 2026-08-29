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
  const SID = '1022155981';

  // 1. Buscar inscripción ClassId=32 con Prisma (sin raw SQL)
  console.log('1. ¿Inscripción ClassId=32?');
  const enr32 = await prisma.classEnrollment.findFirst({
    where: { studentId: SID, classId: 32 }
  });
  console.log('   Prisma findFirst:', enr32 ? `EXISTE (id=${enr32.id}, isActive=${enr32.isActive})` : 'NO EXISTE (fue eliminada físicamente)');

  // 2. Inscripción ClassId=61 (Antonia)
  console.log('\n2. Inscripción ClassId=61 (Antonia):');
  const enr61 = await prisma.classEnrollment.findFirst({
    where: { studentId: SID, classId: 61 }
  });
  if (enr61) {
    console.log(`   ID: ${enr61.id}`);
    console.log(`   paymentCutoffDay: ${enr61.paymentCutoffDay}`);
    console.log(`   isActive: ${enr61.isActive}`);
    console.log(`   enrolledAt: ${fmt(enr61.enrolledAt)}`);
    console.log(`   createdAt: ${fmt(enr61.createdAt)}`);
    console.log(`   updatedAt: ${fmt(enr61.updatedAt)}`);
    const diffMs = new Date(enr61.updatedAt).getTime() - new Date(enr61.createdAt).getTime();
    console.log(`   Diferencia created→updated: ${(diffMs / (1000*60*60*24)).toFixed(1)} días`);
    console.log(`   → ${diffMs > 60000 ? 'Fue modificada después de crearse' : 'Nunca fue modificada'}`);
  }

  // 3. Todas las inscripciones 
  console.log('\n3. Todas las inscripciones para esta estudiante:');
  const allEnr = await prisma.classEnrollment.findMany({
    where: { studentId: SID },
    include: { danceClass: { include: { trainer: { select: { name: true } } } } },
    orderBy: { enrolledAt: 'asc' }
  });
  for (const e of allEnr) {
    console.log(`   #${e.id}: ClassId=${e.classId} "${e.danceClass.name}" (${e.danceClass.trainer?.name})`);
    console.log(`      isActive=${e.isActive} | cutoff=${e.paymentCutoffDay} | enrolled=${fmt(e.enrolledAt)} | updated=${fmt(e.updatedAt)}`);
  }

  // 4. Simulación generateMonthlyPayments para Junio 2026 (periodId=27)
  console.log('\n4. Simulación generateMonthlyPayments para Junio 2026:');
  const period27 = await prisma.paymentPeriod.findUnique({ where: { id: 27 } });
  const periodStart = new Date(period27.year, period27.month - 1, 1);
  const periodEnd = new Date(period27.year, period27.month, 1);
  console.log(`   Período: ${period27.name}`);
  console.log(`   Ventana transferencia: ${fmt(periodStart)} a ${fmt(periodEnd)}`);
  
  const activeClassIds = allEnr.filter(e => e.isActive).map(e => e.classId);
  console.log(`   ActiveClassIds: [${activeClassIds}]`);
  
  const transfers = await prisma.studentTransfer.findMany({
    where: { studentId: SID },
    orderBy: [{ transferredAt: 'asc' }, { id: 'asc' }],
  });
  console.log(`   Transferencias: [${transfers.map(t => `${t.fromClassId}→${t.toClassId}`)}]`);
  
  const chainMap = new Map();
  for (const t of transfers) {
    const edges = chainMap.get(t.fromClassId) ?? [];
    edges.push({ toClassId: t.toClassId });
    chainMap.set(t.fromClassId, edges);
  }
  
  const allPaidInactive = await prisma.monthlyPayment.findMany({
    where: {
      studentId: SID,
      periodId: 27,
      status: { in: ['PAID', 'PARTIAL_PAID'] },
      classId: { notIn: activeClassIds },
    },
  });
  console.log(`   Pagos PAID en clases inactivas para Junio 2026: [${allPaidInactive.map(p => `#${p.id} classId=${p.classId}`).join(', ')}]`);
  
  for (const classId of activeClassIds) {
    console.log(`\n   → Clase activa ClassId=${classId}:`);
    
    const transferInPeriod = transfers.find(t => 
      t.toClassId === classId && 
      new Date(t.transferredAt) >= periodStart && 
      new Date(t.transferredAt) < periodEnd
    );
    
    if (transferInPeriod) {
      console.log(`      Transferencia directa dentro del período: SÍ (#${transferInPeriod.id}, desde ${transferInPeriod.fromClassId})`);
    } else {
      console.log(`      Transferencia directa dentro del período: NO`);
      
      function hasPath(from, to, visited = new Set()) {
        if (from === to) return false;
        if (visited.has(from)) return false;
        visited.add(from);
        const edges = chainMap.get(from) ?? [];
        for (const e of edges) {
          if (e.toClassId === to) return true;
          if (hasPath(e.toClassId, to, visited)) return true;
        }
        return false;
      }
      
      for (const paid of allPaidInactive) {
        const pathExists = hasPath(paid.classId, classId);
        console.log(`      ¿Cadena ${paid.classId}→${classId}? ${pathExists ? 'SÍ' : 'NO'}`);
      }
      
      const coveredByChain = allPaidInactive.some(paid => hasPath(paid.classId, classId));
      console.log(`      coveredByChain: ${coveredByChain}`);
      if (!coveredByChain) {
        console.log('      🚨 → Se CREA nuevo pago PENDING (duplicado)');
      }
    }
  }

  // 5. Simulación para Julio 2026
  console.log('\n5. Simulación generateMonthlyPayments para Julio 2026:');
  const period28 = await prisma.paymentPeriod.findUnique({ where: { id: 28 } });
  const ps28 = new Date(period28.year, period28.month - 1, 1);
  const pe28 = new Date(period28.year, period28.month, 1);
  console.log(`   Período: ${period28.name}, ventana: ${fmt(ps28)} a ${fmt(pe28)}`);
  
  const allPaidInactive28 = await prisma.monthlyPayment.findMany({
    where: {
      studentId: SID,
      periodId: 28,
      status: { in: ['PAID', 'PARTIAL_PAID'] },
      classId: { notIn: activeClassIds },
    },
  });
  console.log(`   Pagos PAID en clases inactivas: [${allPaidInactive28.map(p => `#${p.id} classId=${p.classId}`).join(', ')}]`);
  
  for (const classId of activeClassIds) {
    const transferInPeriod = transfers.find(t => 
      t.toClassId === classId && 
      new Date(t.transferredAt) >= ps28 && 
      new Date(t.transferredAt) < pe28
    );
    
    if (transferInPeriod) {
      console.log(`   Transferencia directa a ${classId} dentro de Julio: SÍ (#${transferInPeriod.id})`);
    } else {
      console.log(`   Transferencia directa a ${classId} dentro de Julio: NO`);
      
      function hasPath(from, to, visited = new Set()) {
        if (from === to) return false;
        if (visited.has(from)) return false;
        visited.add(from);
        const edges = chainMap.get(from) ?? [];
        for (const e of edges) {
          if (e.toClassId === to) return true;
          if (hasPath(e.toClassId, to, visited)) return true;
        }
        return false;
      }
      
      for (const paid of allPaidInactive28) {
        console.log(`   ¿Cadena ${paid.classId}→${classId}? ${hasPath(paid.classId, classId) ? 'SÍ' : 'NO'}`);
      }
      
      const coveredByChain = allPaidInactive28.some(paid => hasPath(paid.classId, classId));
      if (!coveredByChain) {
        console.log('   🚨 → Se CREA nuevo pago PENDING (duplicado)');
      }
    }
  }

  // 6. Conclusión
  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSIÓN FINAL');
  console.log('='.repeat(80));
  console.log(`
  CAUSA RAÍZ: El cambio de grupo de Valery de Carlos Davila (32) a 
  Antonia Contreras (61) NO se hizo a través del endpoint de transferencia
  (/api/enrollments/transfer), sino mediante operaciones manuales:
  
  1. Se ELIMINÓ físicamente la inscripción en ClassId=32
  2. Se CREÓ manualmente una nueva inscripción en ClassId=61
  3. NO se creó el registro StudentTransfer (32→61)
  
  CONSECUENCIA: generateMonthlyPayments NO puede detectar que el pago PAID 
  en la clase 32 cubre la mensualidad en la clase 61, porque:
  - No hay transferencia directa (32→61) dentro del período
  - No hay cadena de transferencias que conecte 32 con 61
  - La inscripción de ClassId=32 fue eliminada, no desactivada
  
  Por lo tanto, genera pagos PENDING duplicados para junio y julio 2026.
  
  ADICIONAL: El payment_cutoff_day de la nueva inscripción probablemente se 
  creó como NULL (o 30), y luego se corrigió a 15 el 2026-08-21. Pero para 
  entonces el pago #8915 ya se había generado con corte 30.
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());