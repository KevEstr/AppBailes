/**
 * Corrige la fecha y hora de partidos (matches) que se almacenaron con el bug de zona horaria.
 *
 * Bug 1: new Date("2026-08-01") crea medianoche UTC, que en BD se almacena como
 *        2026-07-31 19:00:00-05 (un día atrás).
 * Bug 2: la hora siempre quedaba en 00:00 porque el frontend solo enviaba fecha.
 *
 * Fix:
 *   - Suma 5 horas para corregir el día (medianoche UTC → medianoche Colombia).
 *   - Reemplaza la hora (00:00:00) con la hora del createdAt, para conservar
 *     cuándo ocurrió realmente el evento.
 *
 * Uso:
 *   node scripts/fix-match-dates.js            → dry-run
 *   node scripts/fix-match-dates.js --apply    → aplica
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

function fmt(d) {
  if (!d) return 'NULL';
  d = new Date(d);
  const offset = -5 * 60;
  const local = new Date(d.getTime() + offset * 60000);
  return local.toISOString().replace('T', ' ').substring(0, 19) + ' COT';
}

async function main() {
  console.log('='.repeat(100));
  console.log(`CORRECCIÓN DE FECHAS DE PARTIDOS — ${APPLY ? 'APLICAR' : 'DRY-RUN'}`);
  console.log('='.repeat(100));

  const matches = await prisma.match.findMany({
    orderBy: { id: 'asc' },
  });

  console.log(`\nTotal partidos: ${matches.length}`);

  const toFix = [];

  for (const m of matches) {
    const matchDate = new Date(m.matchDate);
    const createdAt = new Date(m.createdAt);

    // matchDate actual en Colombia: si está a medianoche (00:00:00 COT) es porque
    // el frontend nunca envió hora. Corregimos día (si corresponde) y ponemos la
    // hora del createdAt.
    const isMidnightColombia =
      matchDate.getHours() === 0 &&
      matchDate.getMinutes() === 0 &&
      matchDate.getSeconds() === 0;

    if (!isMidnightColombia) continue;

    // Corregir día: sumar 5 horas por si aún está con el bug original
    // (medianoche UTC → 19:00 COT día anterior). Si ya está corregido
    // (medianoche Colombia), sumar 0.
    const isOldBug = matchDate.getUTCHours() === 0;
    const dayShift = isOldBug ? 5 * 60 * 60 * 1000 : 0;

    const dateBase = new Date(matchDate.getTime() + dayShift);

    // Combinar: fecha corregida + hora del createdAt
    const corrected = new Date(
      dateBase.getFullYear(),
      dateBase.getMonth(),
      dateBase.getDate(),
      createdAt.getHours(),
      createdAt.getMinutes(),
      createdAt.getSeconds(),
    );

    toFix.push({
      id: m.id,
      classId: m.classId,
      current: fmt(m.matchDate),
      correctedStr: fmt(corrected),
      correctedDate: corrected,
      createdAt: fmt(m.createdAt),
    });
  }

  console.log(`\n📋 Partidos a corregir: ${toFix.length}`);
  console.log('   ' + '-'.repeat(100));
  console.log('   ID    | Clase  | Actual                     | Corregido                  | Creado');
  console.log('   ' + '-'.repeat(100));
  for (const item of toFix) {
    console.log(
      `   ${String(item.id).padEnd(6)} | ${String(item.classId).padEnd(6)} | ${item.current.padEnd(27)} | ${item.correctedStr.padEnd(27)} | ${item.createdAt}`
    );
  }
  console.log('   ' + '-'.repeat(100));

  if (APPLY) {
    console.log('\n⚙️  Aplicando correcciones...');
    let count = 0;
    for (const item of toFix) {
      await prisma.match.update({
        where: { id: item.id },
        data: { matchDate: item.correctedDate },
      });
      count++;
      if (count % 20 === 0) console.log(`  ${count}/${toFix.length} corregidos`);
    }
    console.log(`✅ ${count} partidos corregidos.`);
  } else {
    console.log('\nℹ️  DRY-RUN: no se modificó nada. Ejecuta con --apply para aplicar.');
  }

  console.log('\n' + '='.repeat(100));
  console.log('FIN');
  console.log('='.repeat(100));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());