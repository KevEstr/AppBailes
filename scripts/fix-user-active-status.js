const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixUserActiveStatus() {
  try {
    console.log('🔧 Iniciando corrección de estado activo de usuarios...');

    // Obtener todos los usuarios
    const users = await prisma.user.findMany({
      include: {
        student: true,
        trainer: true
      }
    });

    console.log(`📊 Total de usuarios encontrados: ${users.length}`);

    let updatedCount = 0;

    for (const user of users) {
      let shouldBeActive = true;

      // Si el usuario tiene un estudiante relacionado, verificar su estado
      if (user.student) {
        shouldBeActive = user.student.isActive;
        console.log(`👤 Usuario ${user.email} (Estudiante: ${user.student.name}) - Estado estudiante: ${user.student.isActive}`);
      }

      // Si el usuario tiene un entrenador relacionado, verificar su estado
      if (user.trainer) {
        shouldBeActive = user.trainer.isActive;
        console.log(`👨‍🏫 Usuario ${user.email} (Entrenador: ${user.trainer.name}) - Estado entrenador: ${user.trainer.isActive}`);
      }

      // Si el estado del usuario no coincide con el estado de su relación, actualizarlo
      if (user.isActive !== shouldBeActive) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: shouldBeActive }
        });
        
        console.log(`✅ Actualizado usuario ${user.email}: isActive = ${shouldBeActive}`);
        updatedCount++;
      }
    }

    console.log(`\n🎉 Proceso completado:`);
    console.log(`   - Usuarios procesados: ${users.length}`);
    console.log(`   - Usuarios actualizados: ${updatedCount}`);

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
fixUserActiveStatus(); 