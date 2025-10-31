const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyMigration() {
  try {
    console.log('🔍 Verificando migración de paymentCutoffDay...');
    
    // Obtener estadísticas de la migración
    const stats = await prisma.classEnrollment.groupBy({
      by: ['paymentCutoffDay'],
      where: {
        isActive: true,
        paymentCutoffDay: {
          not: null
        }
      },
      _count: {
        id: true
      }
    });

    console.log('\n📊 Distribución de paymentCutoffDay en ClassEnrollments:');
    stats.forEach(stat => {
      console.log(`   - Día ${stat.paymentCutoffDay}: ${stat._count.id} inscripciones`);
    });

    // Verificar estudiantes sin paymentCutoffDay
    const studentsWithoutCutoff = await prisma.student.findMany({
      where: {
        enrollmentData: {
          paymentCutoffDay: null
        }
      },
      select: {
        id: true,
        name: true
      }
    });

    if (studentsWithoutCutoff.length > 0) {
      console.log('\n⚠️  Estudiantes sin paymentCutoffDay en enrollmentData:');
      studentsWithoutCutoff.forEach(student => {
        console.log(`   - ${student.name} (${student.id})`);
      });
    }

    // Verificar ClassEnrollments sin paymentCutoffDay
    const enrollmentsWithoutCutoff = await prisma.classEnrollment.count({
      where: {
        isActive: true,
        paymentCutoffDay: null
      }
    });

    if (enrollmentsWithoutCutoff > 0) {
      console.log(`\n⚠️  ClassEnrollments sin paymentCutoffDay: ${enrollmentsWithoutCutoff}`);
    } else {
      console.log('\n✅ Todos los ClassEnrollments activos tienen paymentCutoffDay configurado');
    }

    // Verificar consistencia entre enrollmentData y ClassEnrollments
    const inconsistentStudents = await prisma.student.findMany({
      where: {
        enrollmentData: {
          isNot: null
        },
        classEnrollments: {
          some: {
            isActive: true,
            paymentCutoffDay: {
              not: prisma.student.fields.enrollmentData.paymentCutoffDay
            }
          }
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

    if (inconsistentStudents.length > 0) {
      console.log('\n⚠️  Estudiantes con inconsistencias:');
      inconsistentStudents.forEach(student => {
        console.log(`   - ${student.name} (${student.id}):`);
        console.log(`     * EnrollmentData paymentCutoffDay: ${student.enrollmentData?.paymentCutoffDay}`);
        student.classEnrollments.forEach(enrollment => {
          console.log(`     * ClassEnrollment ${enrollment.classId}: ${enrollment.paymentCutoffDay}`);
        });
      });
    } else {
      console.log('\n✅ Todos los estudiantes tienen configuración consistente');
    }

    console.log('\n🎉 Verificación completada');

  } catch (error) {
    console.error('💥 Error durante la verificación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar la verificación
verifyMigration()
  .then(() => {
    console.log('✅ Script de verificación ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error ejecutando el script de verificación:', error);
    process.exit(1);
  });

