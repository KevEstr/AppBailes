#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Configurando módulo de productos...\n');

try {
  // 1. Generar y aplicar migración
  console.log('📦 Generando migración de productos...');
  execSync('npx prisma migrate dev --name add_products_module', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Migración aplicada exitosamente\n');

  // 2. Generar cliente de Prisma
  console.log('🔧 Generando cliente de Prisma...');
  execSync('npx prisma generate', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Cliente de Prisma generado\n');

  // 3. Ejecutar seeder de productos
  console.log('🌱 Ejecutando seeder de productos...');
  execSync('npx tsx scripts/seed-products.ts', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Seeder ejecutado exitosamente\n');

  console.log('🎉 ¡Módulo de productos configurado completamente!');
  console.log('\n📋 Resumen de lo que se ha creado:');
  console.log('   • Tablas de productos y ventas en la base de datos');
  console.log('   • API endpoints para gestión de productos');
  console.log('   • Página de administración de productos');
  console.log('   • Modal para crear/editar productos');
  console.log('   • 10 productos de ejemplo (jugos y snacks)');
  console.log('   • Enlace en el menú de administración');
  console.log('\n🔗 Accede a: http://localhost:3000/admin/products');

} catch (error) {
  console.error('❌ Error durante la configuración:', error.message);
  process.exit(1);
}
