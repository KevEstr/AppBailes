/**
 * Corrige la fecha de partidos (matches) que se almacenaron con el bug de zona horaria.
 *
 * Bug: new Date("2026-08-01") crea medianoche UTC, que al guardarse en PostgreSQL
 * con zona horaria Colombia (UTC-5) se almacena como 2026-07-31 19:00:00-05.
 * El día se desplaza un día atrás.
 *
 * Fix: matchDate + 5 horas → pasa de medianoche UTC (7pm Colombia del día anterior)
 * a medianoche Colombia (0:00-05) del día correcto.
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

    // Solo corregir si la hora UTC es medianoche (00:00:00 UTC), que es el
    // patrón del bug: el frontend enviaba "2026-08-01T00:00:00.000Z".
    const isMidnightUTC =
      matchDate.getUTCHours() === 0 &&
      matchDate.getUTCMinutes() === 0 &&
      matchDate.getUTCSeconds() === 0;

    if (!isMidnightUTC) continue;

    // matchDate actual: medianoche UTC → 7pm Colombia del día anterior.
    // Sumar 5 horas → medianoche Colombia del día correcto.
    const corrected = new Date(matchDate.getTime() + 5 * 60 * 60 * 1000);

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
  console.log('   ' + '-'.repeat(90));
  console.log('   ID    | Clase  | Actual                     | Corregido                  | Creado');
  console.log('   ' + '-'.repeat(90));
  for (const item of toFix) {
    console.log(
      `   ${String(item.id).padEnd(6)} | ${String(item.classId).padEnd(6)} | ${item.current.padEnd(27)} | ${item.correctedStr.padEnd(27)} | ${item.createdAt}`
    );
  }
  console.log('   ' + '-'.repeat(90));

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