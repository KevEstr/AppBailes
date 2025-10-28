const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function makeClassIdRequired() {
  console.log('🔄 Haciendo classId requerido...');

  try {
    // 1. Verificar que no hay pagos con classId null
    const nullClassIdPayments = await prisma.monthlyPayment.count({
      where: {
        classId: null
      }
    });

    if (nullClassIdPayments > 0) {
      console.log(`⚠️ Aún hay ${nullClassIdPayments} pagos con classId null. Ejecuta primero el script de migración.`);
      return;
    }

    console.log('✅ Todos los pagos tienen classId asignado');
    console.log('📝 Ahora puedes cambiar el schema para hacer classId requerido:');
    console.log('   - Cambiar "classId Int?" por "classId Int"');
    console.log('   - Cambiar "danceClass DanceClass?" por "danceClass DanceClass"');
    console.log('   - Ejecutar "npx prisma db push"');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar verificación
makeClassIdRequired()
  .then(() => {
    console.log('✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en la verificación:', error);
    process.exit(1);
  });
