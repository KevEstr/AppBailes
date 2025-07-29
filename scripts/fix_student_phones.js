// Script para anteponer el indicativo a los teléfonos de estudiantes según país
// Uso: node scripts/fix_student_phones.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Puedes ajustar la lógica de país según tu modelo de datos
// Aquí se asume que el campo city o address puede indicar el país
// Si tienes un campo explícito de país, úsalo

async function main() {
  // Actualizar guardianPhone en StudentEnrollmentData
  const enrollments = await prisma.studentEnrollmentData.findMany();
  for (const enrollment of enrollments) {
    let guardianPhone = enrollment.guardianPhone || '';
    guardianPhone = guardianPhone.replace(/\D/g, '');

    // Si ya tiene indicativo, saltar
    if (guardianPhone.startsWith('57') || guardianPhone.startsWith('58') || guardianPhone.length === 0) continue;

    let newGuardianPhone;
    if (guardianPhone.startsWith('3')) {
      newGuardianPhone = '57' + guardianPhone;
    } else {
      newGuardianPhone = '58' + guardianPhone;
    }

    if (newGuardianPhone !== enrollment.guardianPhone) {
      await prisma.studentEnrollmentData.update({
        where: { id: enrollment.id },
        data: { guardianPhone: newGuardianPhone }
      });
      console.log(`Actualizado guardianPhone: (${enrollment.id}) -> ${newGuardianPhone}`);
    }
  }
  const students = await prisma.student.findMany({
    include: { enrollmentData: true }
  });

  for (const student of students) {
    let phone = student.phone || '';
    // Limpiar el teléfono de espacios y guiones
    phone = phone.replace(/\D/g, '');

    // Si ya tiene indicativo, saltar
    if (phone.startsWith('57') || phone.startsWith('58')) continue;

    let newPhone = phone;
    if (phone.startsWith('3')) {
      // Colombia
      newPhone = '57' + phone;
    } else {
      // Venezuela (por descarte)
      newPhone = '58' + phone;
    }

    // Actualizar solo si cambió
    if (newPhone !== student.phone) {
      await prisma.student.update({
        where: { id: student.id },
        data: { phone: newPhone }
      });
      console.log(`Actualizado: ${student.name} (${student.id}) -> ${newPhone}`);
    }
  }

  await prisma.$disconnect();
  console.log('Actualización completada.');
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
