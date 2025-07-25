const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function populateUserIds() {
  try {
    console.log('🔄 Iniciando proceso de poblamiento de userId en students...');
    
    // Obtener todos los estudiantes que no tienen userId pero sí tienen email
    const studentsWithoutUserId = await prisma.student.findMany({
      where: {
        userId: null,
        email: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    console.log(`📊 Encontrados ${studentsWithoutUserId.length} estudiantes sin userId`);

    let updated = 0;
    let notFound = 0;

    for (const student of studentsWithoutUserId) {
      try {
        // Buscar el usuario correspondiente por email
        const user = await prisma.user.findUnique({
          where: {
            email: student.email
          }
        });

        if (user) {
          // Actualizar el estudiante con el userId
          await prisma.student.update({
            where: {
              id: student.id
            },
            data: {
              userId: user.id
            }
          });
          
          console.log(`✅ Estudiante ${student.name} (${student.email}) vinculado con user ID ${user.id}`);
          updated++;
        } else {
          console.log(`⚠️  No se encontró usuario para: ${student.name} (${student.email})`);
          notFound++;
        }
      } catch (error) {
        console.error(`❌ Error procesando estudiante ${student.name}:`, error.message);
      }
    }

    console.log('\n📈 Resumen:');
    console.log(`✅ Estudiantes actualizados: ${updated}`);
    console.log(`⚠️  Estudiantes sin usuario correspondiente: ${notFound}`);
    console.log('✨ Proceso completado');

  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    await prisma.$disconnect();
  }
}

populateUserIds();
