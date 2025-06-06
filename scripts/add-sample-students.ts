import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Crear estudiantes de prueba
  const students = [
    { name: 'María González', email: 'maria@example.com', phone: '3001234567', isActive: true },
    { name: 'Carlos Rodríguez', email: 'carlos@example.com', phone: '3001234568', isActive: true },
    { name: 'Ana Martínez', email: 'ana@example.com', phone: '3001234569', isActive: true },
    { name: 'Luis Pérez', email: 'luis@example.com', phone: '3001234570', isActive: true },
    { name: 'Sofia López', email: 'sofia@example.com', phone: '3001234571', isActive: true },
  ];

  console.log('Agregando estudiantes de prueba...');

  for (const student of students) {
    const existing = await prisma.student.findFirst({
      where: { phone: student.phone }
    });

    if (!existing) {
      // Obtener el último ID para incrementar manualmente
      const lastStudent = await prisma.student.findFirst({
        orderBy: { id: 'desc' }
      });
      const nextId = (lastStudent?.id || 0) + 1;
      
      await prisma.student.create({
        data: {
          ...student,
          id: nextId
        }
      });
      console.log(`✅ Creado: ${student.name} (ID: ${nextId})`);
    } else {
      console.log(`⏭️  Ya existe: ${student.name}`);
    }
  }

  // Crear configuración de mensualidad si no existe
  const existingFee = await prisma.monthlyFeeConfig.findFirst({
    where: { isActive: true }
  });

  if (!existingFee) {
    await prisma.monthlyFeeConfig.create({
      data: {
        amount: 150000,
        description: 'Mensualidad Paradise Dance Academy',
        isActive: true,
        validFrom: new Date(),
        createdBy: 'system'
      }
    });
    console.log('✅ Configuración de mensualidad creada: $150,000');
  } else {
    console.log('⏭️  Configuración de mensualidad ya existe');
  }

  console.log('\n🎉 ¡Datos de prueba agregados exitosamente!');
  console.log('\nPuedes ahora:');
  console.log('1. Crear un período de pago');
  console.log('2. Generar formularios para los estudiantes');
  console.log('3. Probar el sistema completo');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 