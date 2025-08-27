const { execSync } = require('child_process');
const path = require('path');

async function runProductSeed() {
  try {
    console.log('🚀 Iniciando proceso de carga de productos...\n');
    
    // 1. Generar y aplicar migración de Prisma
    console.log('📦 Generando migración de Prisma...');
    try {
      execSync('npx prisma migrate dev --name add_product_categories', { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Migración aplicada exitosamente\n');
    } catch (error) {
      console.log('⚠️  La migración ya existe o no es necesaria, continuando...\n');
    }
    
    // 2. Generar cliente de Prisma
    console.log('🔧 Generando cliente de Prisma...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log('✅ Cliente de Prisma generado\n');
    
    // 3. Ejecutar script de productos
    console.log('🌱 Ejecutando script de productos...');
    const { seedProducts } = require('./seed-products.js');
    await seedProducts();
    
    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('📝 Los productos han sido añadidos a la base de datos.');
    
  } catch (error) {
    console.error('❌ Error durante el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar el script
if (require.main === module) {
  runProductSeed();
}

module.exports = { runProductSeed };
