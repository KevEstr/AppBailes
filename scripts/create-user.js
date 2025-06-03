const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  console.log('🌱 Creando usuario administrador...');
  
  try {
    // Verificar si ya existe un usuario admin
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@academia.com' },
          { role: 'ADMIN' }
        ]
      }
    });

    if (existingUser) {
      console.log('✅ Usuario administrador ya existe:', existingUser.email);
      return;
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123456', 12);

    // Crear usuario admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@academia.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN',
        isActive: true
      }
    });

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('🔑 Credenciales de acceso:');
    console.log('📧 Email:', adminUser.email);
    console.log('🔒 Contraseña: admin123456');
    console.log('👤 Nombre:', adminUser.name);
    console.log('🏷️ Rol:', adminUser.role);

  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser(); 