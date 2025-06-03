const bcrypt = require('bcryptjs');

async function createAdmin() {
  console.log('🌱 Creating admin user...');
  
  const adminData = {
    email: 'admin@academia.com',
    password: 'admin123456',
    confirmPassword: 'admin123456',
    name: 'Administrador'
  };

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adminData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Admin user created successfully!');
      console.log('🔑 Login credentials:');
      console.log('Email:', adminData.email);
      console.log('Password:', adminData.password);
    } else {
      console.log('❌ Error creating admin:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

createAdmin(); 