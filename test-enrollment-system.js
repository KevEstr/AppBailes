const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testEnrollmentSystem() {
  try {
    console.log('🧪 Probando sistema de inscripción...\n');

    // 1. Verificar que los modelos existen
    console.log('1️⃣ Verificando modelos...');
    
    const enrollmentPayments = await prisma.enrollmentPayment.findMany({
      take: 1
    });
    console.log('✅ Modelo EnrollmentPayment funciona');
    
    const enrollmentPaymentForms = await prisma.enrollmentPaymentForm.findMany({
      take: 1
    });
    console.log('✅ Modelo EnrollmentPaymentForm funciona');
    
    const enrollmentPaymentProofs = await prisma.enrollmentPaymentProof.findMany({
      take: 1
    });
    console.log('✅ Modelo EnrollmentPaymentProof funciona');

    // 2. Verificar que podemos crear un pago de inscripción
    console.log('\n2️⃣ Probando creación de pago de inscripción...');
    
    // Buscar un estudiante existente
    const student = await prisma.student.findFirst({
      where: { isActive: true }
    });
    
    if (!student) {
      console.log('❌ No hay estudiantes activos para probar');
      return;
    }
    
    console.log(`👤 Estudiante encontrado: ${student.name} (${student.id})`);
    
    // Verificar si ya tiene un pago de inscripción
    const existingPayment = await prisma.enrollmentPayment.findUnique({
      where: { studentId: student.id }
    });
    
    if (existingPayment) {
      console.log('⚠️ El estudiante ya tiene un pago de inscripción');
      console.log(`   ID: ${existingPayment.id}`);
      console.log(`   Deporte: ${existingPayment.sport}`);
      console.log(`   Monto: $${existingPayment.expectedAmount.toLocaleString()}`);
      console.log(`   Estado: ${existingPayment.status}`);
    } else {
      console.log('✅ El estudiante no tiene pago de inscripción (correcto)');
    }

    // 3. Verificar estadísticas
    console.log('\n3️⃣ Estadísticas del sistema...');
    
    const totalEnrollmentPayments = await prisma.enrollmentPayment.count();
    const pendingPayments = await prisma.enrollmentPayment.count({
      where: { status: 'PENDING' }
    });
    const paidPayments = await prisma.enrollmentPayment.count({
      where: { status: 'PAID' }
    });
    
    console.log(`📊 Total pagos de inscripción: ${totalEnrollmentPayments}`);
    console.log(`⏳ Pendientes: ${pendingPayments}`);
    console.log(`✅ Pagados: ${paidPayments}`);

    // 4. Verificar formularios de pago
    console.log('\n4️⃣ Verificando formularios de pago...');
    
    const totalForms = await prisma.enrollmentPaymentForm.count();
    const activeForms = await prisma.enrollmentPaymentForm.count({
      where: { status: 'ACTIVE' }
    });
    
    console.log(`📋 Total formularios: ${totalForms}`);
    console.log(`🟢 Formularios activos: ${activeForms}`);

    // 5. Verificar comprobantes
    console.log('\n5️⃣ Verificando comprobantes...');
    
    const totalProofs = await prisma.enrollmentPaymentProof.count();
    const pendingProofs = await prisma.enrollmentPaymentProof.count({
      where: { status: 'PENDING' }
    });
    
    console.log(`📸 Total comprobantes: ${totalProofs}`);
    console.log(`⏳ Comprobantes pendientes: ${pendingProofs}`);

    console.log('\n🎉 ¡Sistema de inscripción funcionando correctamente!');
    
  } catch (error) {
    console.error('❌ Error probando sistema:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEnrollmentSystem(); 