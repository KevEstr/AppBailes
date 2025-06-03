const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateToIntegerIds() {
  console.log('🚀 Iniciando migración de IDs CUID a enteros...');
  
  try {
    // ADVERTENCIA: Este script elimina todos los datos y los recreará con nuevos IDs
    // Solo ejecutar en desarrollo o después de hacer backup
    
    console.log('⚠️  ADVERTENCIA: Este script eliminará todos los datos existentes');
    console.log('⚠️  Asegúrate de haber hecho backup de tu base de datos');
    console.log('⚠️  Presiona Ctrl+C para cancelar en los próximos 5 segundos...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('🗑️  Eliminando datos existentes...');
    
    // Eliminar todos los datos en orden correcto (respetando foreign keys)
    await prisma.attendance.deleteMany();
    await prisma.classSession.deleteMany();
    await prisma.classSchedule.deleteMany();
    await prisma.classEnrollment.deleteMany();
    await prisma.receipt.deleteMany();
    await prisma.debt.deleteMany();
    await prisma.trainerAttendance.deleteMany();
    await prisma.massiveMessage.deleteMany();
    await prisma.danceClass.deleteMany();
    await prisma.trainer.deleteMany();
    await prisma.student.deleteMany();
    
    console.log('✅ Datos eliminados exitosamente');
    
    console.log('🔧 Ejecutando migración de schema...');
    console.log('📝 Nota: Debes ejecutar "npx prisma migrate reset" y "npx prisma db push" después de este script');
    
    console.log('✅ Migración completada');
    console.log('📋 Próximos pasos:');
    console.log('   1. Ejecuta: npx prisma migrate reset');
    console.log('   2. Ejecuta: npx prisma db push');
    console.log('   3. Ejecuta: npx prisma generate');
    console.log('   4. Recrea tus datos de prueba');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Función para crear datos de ejemplo después de la migración
async function createSampleData() {
  console.log('🏗️  Creando datos de ejemplo...');
  
  try {
    // Crear entrenador de ejemplo
    const trainer = await prisma.trainer.create({
      data: {
        name: 'Carlos Vega',
        email: 'carlos@danceacademy.com',
        phone: '3001234567'
      }
    });
    
    // Crear estudiante de ejemplo con cédula
    const student = await prisma.student.create({
      data: {
        id: 1036689216, // Cédula de ejemplo
        name: 'María González',
        email: 'maria@example.com',
        phone: '3009876543'
      }
    });
    
    // Crear clase de ejemplo
    const danceClass = await prisma.danceClass.create({
      data: {
        name: 'Salsa Básica',
        description: 'Clase de salsa para principiantes',
        trainerId: trainer.id,
        capacity: 20,
        price: 50000
      }
    });
    
    // Crear horario de ejemplo
    await prisma.classSchedule.create({
      data: {
        classId: danceClass.id,
        dayOfWeek: 1, // Lunes
        startTime: '19:00',
        endTime: '20:30'
      }
    });
    
    console.log('✅ Datos de ejemplo creados:');
    console.log(`   👨‍🏫 Entrenador: ${trainer.name} (ID: ${trainer.id})`);
    console.log(`   👩‍🎓 Estudiante: ${student.name} (Cédula: ${student.id})`);
    console.log(`   💃 Clase: ${danceClass.name} (ID: ${danceClass.id})`);
    
  } catch (error) {
    console.error('❌ Error creando datos de ejemplo:', error);
  }
}

// Ejecutar migración
if (process.argv.includes('--with-sample-data')) {
  migrateToIntegerIds().then(() => createSampleData());
} else {
  migrateToIntegerIds();
} 