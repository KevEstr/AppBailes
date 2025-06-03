import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('🌱 Creating admin user...');
  
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@academia.com' }
    });

    if (existingAdmin) {
      console.log('👑 Admin user already exists');
      console.log('🔑 Login credentials:');
      console.log('Email: admin@academia.com');
      console.log('Password: admin123456');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123456', 12);
    
    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: 'admin@academia.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'ADMIN'
      }
    });

    console.log('✅ Admin user created successfully!');
    console.log('👑 Admin details:', {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });
    console.log('');
    console.log('🔑 Login credentials:');
    console.log('Email: admin@academia.com');
    console.log('Password: admin123456');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin(); 