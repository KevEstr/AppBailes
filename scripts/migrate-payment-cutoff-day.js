const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migratePaymentCutoffDay() {
  try {
    console.log('🚀 Iniciando migración de paymentCutoffDay...');
    
    // Obtener todos los estudiantes con enrollmentData
    const students = await prisma.student.findMany({
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
          }
        }
      }
    });

    console.log(`📊 Encontrados ${students.length} estudiantes con enrollmentData`);

    let totalUpdated = 0;
    let studentsProcessed = 0;

    for (const student of students) {
      try {
        // Obtener el paymentCutoffDay del enrollmentData
        const paymentCutoffDay = student.enrollmentData?.paymentCutoffDay;
        
        if (!paymentCutoffDay) {
          console.log(`⚠️  Estudiante ${student.name} (${student.id}) no tiene paymentCutoffDay en enrollmentData`);
          continue;
        }

        // Actualizar todos los ClassEnrollments activos del estudiante
        const updateResult = await prisma.classEnrollment.updateMany({
          where: {
            studentId: student.id,
            isActive: true
          },
          data: {
            paymentCutoffDay: paymentCutoffDay
          }
        });

        if (updateResult.count > 0) {
          console.log(`✅ Estudiante ${student.name} (${student.id}):`);
          console.log(`   - PaymentCutoffDay: ${paymentCutoffDay}`);
          console.log(`   - ClassEnrollments actualizados: ${updateResult.count}`);
          totalUpdated += updateResult.count;
        }

        studentsProcessed++;

      } catch (error) {
        console.error(`❌ Error procesando estudiante ${student.name} (${student.id}):`, error);
      }
    }

    console.log('\n📈 Resumen de la migración:');
    console.log(`   - Estudiantes procesados: ${studentsProcessed}`);
    console.log(`   - ClassEnrollments actualizados: ${totalUpdated}`);
    console.log('✅ Migración completada exitosamente');

  } catch (error) {
    console.error('💥 Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la migración
migratePaymentCutoffDay()
  .then(() => {
    console.log('🎉 Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error ejecutando el script:', error);
    process.exit(1);
  });
