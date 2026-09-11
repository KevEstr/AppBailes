/**
 * Corrige la fecha de asistencias de entrenadores en eventos (match_trainer_attendances)
 * que se almacenaron con el mismo bug de zona horaria de los partidos.
 *
 * La fecha se sincroniza con el matchDate corregido de la tabla matches.
 *
 * Uso:
 *   node scripts/fix-match-trainer-attendances.js            → dry-run
 *   node scripts/fix-match-trainer-attendances.js --apply    → aplica
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
  console.log(`CORRECCIÓN DE ASISTENCIAS DE ENTRENADORES EN EVENTOS — ${APPLY ? 'APLICAR' : 'DRY-RUN'}`);
  console.log('='.repeat(100));

  const attendances = await prisma.matchTrainerAttendance.findMany({
    include: {
      match: { select: { id: true, matchDate: true } },
    },
    orderBy: { id: 'asc' },
  });

  console.log(`\nTotal asistencias: ${attendances.length}`);

  const toFix = [];

  for (const a of attendances) {
    const attDate = new Date(a.date);
    const matchDate = new Date(a.match.matchDate);

    // Solo corregir si la fecha de la asistencia está a medianoche (00:00:00 COT)
    // o si tiene el bug del día anterior (19:00 COT = medianoche UTC).
    const isMidnightColombia =
      attDate.getHours() === 0 &&
      attDate.getMinutes() === 0 &&
      attDate.getSeconds() === 0;

    const isOldBug =
      attDate.getUTCHours() === 0 &&
      attDate.getUTCMinutes() === 0 &&
      attDate.getUTCSeconds() === 0;

    if (!isMidnightColombia && !isOldBug) continue;

    // La asistencia del entrenador debe tener la misma fecha que el match
    toFix.push({
      id: a.id,
      matchId: a.matchId,
      current: fmt(a.date),
      correctedStr: fmt(matchDate),
      correctedDate: new Date(matchDate),
      matchDate: fmt(a.match.matchDate),
    });
  }

  console.log(`\n📋 Asistencias a corregir: ${toFix.length}`);
  console.log('   ' + '-'.repeat(90));
  console.log('   ID    | Match | Actual                     | Corregido                  | MatchDate');
  console.log('   ' + '-'.repeat(90));
  for (const item of toFix) {
    console.log(
      `   ${String(item.id).padEnd(6)} | ${String(item.matchId).padEnd(6)} | ${item.current.padEnd(27)} | ${item.correctedStr.padEnd(27)} | ${item.matchDate}`
    );
  }
  console.log('   ' + '-'.repeat(90));

  if (APPLY) {
    console.log('\n⚙️  Aplicando correcciones...');
    let count = 0;
    for (const item of toFix) {
      await prisma.matchTrainerAttendance.update({
        where: { id: item.id },
        data: { date: item.correctedDate },
      });
      count++;
      if (count % 20 === 0) console.log(`  ${count}/${toFix.length} corregidos`);
    }
    console.log(`✅ ${count} asistencias corregidas.`);
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