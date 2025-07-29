const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateMonthlyFees() {
  try {
    console.log('🔄 Iniciando actualización de mensualidades...');

    // Obtener todos los estudiantes que tienen datos de inscripción
    const studentsWithEnrollmentData = await prisma.student.findMany({
      where: {
        enrollmentData: {
          isNot: null
        }
      },
      include: {
        enrollmentData: true,
        classEnrollments: {
          where: {
            isActive: true
          },
          include: {
            danceClass: {
              select: {
                sport: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Encontrados ${studentsWithEnrollmentData.length} estudiantes con datos de inscripción`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const student of studentsWithEnrollmentData) {
      try {
        console.log(`\n👤 Procesando estudiante: ${student.name} (ID: ${student.id})`);

        // Verificar si el estudiante tiene inscripciones activas
        if (student.classEnrollments.length === 0) {
          console.log(`   ⚠️  No tiene inscripciones activas - saltando`);
          skippedCount++;
          continue;
        }

        // Determinar el tipo de deporte basado en las clases inscritas
        const sports = [...new Set(student.classEnrollments.map(enrollment => enrollment.danceClass.sport))];
        
        if (sports.length === 0) {
          console.log(`   ⚠️  No se pudo determinar el tipo de deporte - saltando`);
          skippedCount++;
          continue;
        }

        // Si tiene múltiples deportes, usar el primero (priorizar DANCE sobre VOLLEYBALL)
        const primarySport = sports.includes('DANCE') ? 'DANCE' : sports[0];
        
        // Determinar la mensualidad basada en el deporte
        let monthlyFee;
        if (primarySport === 'DANCE') {
          monthlyFee = 60000;
          console.log(`   💃 Deporte: DANCE - Mensualidad: $${monthlyFee.toLocaleString()}`);
        } else if (primarySport === 'VOLLEYBALL') {
          monthlyFee = 65000;
          console.log(`   🏐 Deporte: VOLLEYBALL - Mensualidad: $${monthlyFee.toLocaleString()}`);
        } else {
          console.log(`   ⚠️  Deporte desconocido: ${primarySport} - saltando`);
          skippedCount++;
          continue;
        }

        // Verificar si la mensualidad actual es diferente
        const currentMonthlyFee = student.enrollmentData?.monthlyFee;
        if (currentMonthlyFee === monthlyFee) {
          console.log(`   ✅ Mensualidad ya está actualizada ($${currentMonthlyFee?.toLocaleString()})`);
          skippedCount++;
          continue;
        }

        // Actualizar la mensualidad
        await prisma.studentEnrollmentData.update({
          where: {
            studentId: student.id
          },
          data: {
            monthlyFee: monthlyFee
          }
        });

        console.log(`   ✅ Actualizado: $${currentMonthlyFee?.toLocaleString() || 'N/A'} → $${monthlyFee.toLocaleString()}`);
        updatedCount++;

      } catch (error) {
        console.error(`   ❌ Error procesando estudiante ${student.name}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n🎯 RESUMEN DE LA ACTUALIZACIÓN:');
    console.log(`📊 Total de estudiantes procesados: ${studentsWithEnrollmentData.length}`);
    console.log(`✅ Actualizados exitosamente: ${updatedCount}`);
    console.log(`⏭️  Saltados (sin cambios necesarios): ${skippedCount}`);
    console.log(`❌ Errores: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Algunos estudiantes no pudieron ser procesados. Revisa los errores arriba.');
    } else {
      console.log('\n🎉 ¡Actualización completada exitosamente!');
    }

  } catch (error) {
    console.error('💥 Error fatal durante la actualización:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
updateMonthlyFees()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  });