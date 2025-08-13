const { execSync } = require('child_process');

async function createMigration() {
  try {
    console.log('🔄 Creando migración con Prisma...');
    
    // Crear una nueva migración
    execSync('npx prisma migrate dev --name add_new_models', { stdio: 'inherit' });
    
    console.log('✅ Migración creada exitosamente');
    console.log('📝 Las migraciones manejan automáticamente las dependencias de vistas');
    
  } catch (error) {
    console.error('❌ Error al crear migración:', error.message);
    
    // Si falla, usar el método manual
    console.log('🔄 Intentando método manual...');
    execSync('node scripts/fix-products-migration.js', { stdio: 'inherit' });
  }
}

createMigration();
