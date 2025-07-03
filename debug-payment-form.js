const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugPaymentForm() {
  try {
    const formId = 'cmcmftlm90005v9hgenvowcar';
    
    console.log('🔍 Verificando formulario de pago:', formId);
    
    const form = await prisma.paymentForm.findUnique({
      where: { id: formId },
      include: {
        student: true,
        period: true,
        monthlyPayment: true
      }
    });

    if (!form) {
      console.log('❌ Formulario no encontrado');
      return;
    }

    console.log('\n📋 DATOS DEL FORMULARIO:');
    console.log('- ID:', form.id);
    console.log('- Estado:', form.status);
    console.log('- Estudiante ID:', form.studentId);
    console.log('- Creado el:', form.createdAt);

    console.log('\n👤 DATOS DEL ESTUDIANTE:');
    if (form.student) {
      console.log('- ID:', form.student.id);
      console.log('- Nombre:', form.student.name);
      console.log('- Email:', form.student.email || 'Sin email');
      console.log('- Teléfono:', form.student.phone || 'Sin teléfono');
      console.log('- Actualizado el:', form.student.updatedAt);
    } else {
      console.log('❌ No se encontró información del estudiante');
    }

    console.log('\n📅 DATOS DEL PERÍODO:');
    if (form.period) {
      console.log('- Nombre:', form.period.name);
      console.log('- Año:', form.period.year);
      console.log('- Mes:', form.period.month);
    } else {
      console.log('❌ No se encontró información del período');
    }

    console.log('\n💰 DATOS DEL PAGO:');
    if (form.monthlyPayment) {
      console.log('- Monto esperado:', form.monthlyPayment.expectedAmount);
      console.log('- Estado:', form.monthlyPayment.status);
    } else {
      console.log('❌ No se encontró información del pago mensual');
    }

    // Verificar el estudiante directamente por ID
    console.log('\n🔍 VERIFICANDO ESTUDIANTE DIRECTAMENTE:');
    const student = await prisma.student.findUnique({
      where: { id: form.studentId }
    });

    if (student) {
      console.log('- Nombre actual:', student.name);
      console.log('- Email:', student.email || 'Sin email');
      console.log('- Teléfono:', student.phone || 'Sin teléfono');
      console.log('- Última actualización:', student.updatedAt);
    } else {
      console.log('❌ Estudiante no encontrado por ID:', form.studentId);
    }

    // Buscar todos los estudiantes para ver si hay duplicados
    console.log('\n📋 TODOS LOS ESTUDIANTES:');
    const allStudents = await prisma.student.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        updatedAt: true
      },
      orderBy: { id: 'asc' }
    });

    allStudents.forEach(s => {
      console.log(`- ${s.id}: ${s.name} (${s.email || 'sin email'}) - Tel: ${s.phone || 'sin tel'}`);
    });

  } catch (error) {
    console.error('❌ Error completo:', error);
    console.error('❌ Stack trace:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugPaymentForm(); 