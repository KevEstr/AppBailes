import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando datos en la base de datos...\n');

  // Verificar estudiantes
  const students = await prisma.student.findMany({
    where: { isActive: true }
  });
  console.log(`👥 Estudiantes activos: ${students.length}`);
  students.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.name} (ID: ${s.id})`);
  });

  // Verificar configuración de mensualidad
  const feeConfig = await prisma.monthlyFeeConfig.findFirst({
    where: { isActive: true },
    orderBy: { validFrom: 'desc' }
  });
  console.log(`\n💰 Configuración de mensualidad:`);
  if (feeConfig) {
    console.log(`   Monto: $${feeConfig.amount.toLocaleString()}`);
    console.log(`   Descripción: ${feeConfig.description || 'Sin descripción'}`);
  } else {
    console.log('   ❌ No hay configuración activa');
  }

  // Verificar períodos
  const periods = await prisma.paymentPeriod.findMany({
    orderBy: { id: 'desc' }
  });
  console.log(`\n📅 Períodos de pago: ${periods.length}`);
  periods.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.name} (ID: ${p.id})`);
  });

  // Verificar pagos mensuales del último período
  if (periods.length > 0) {
    const latestPeriod = periods[0];
    const payments = await prisma.monthlyPayment.findMany({
      where: { periodId: latestPeriod.id },
      include: { student: true }
    });
    console.log(`\n📋 Pagos generados para ${latestPeriod.name}: ${payments.length}`);
    payments.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.student.name} - $${p.expectedAmount.toLocaleString()} (${p.status})`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect()); 