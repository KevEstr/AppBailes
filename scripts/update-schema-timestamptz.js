const fs = require('fs');
const path = require('path');

// Script para actualizar el schema de Prisma agregando @db.Timestamptz a todas las columnas DateTime

function updateSchemaFile() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  
  try {
    // Leer el archivo schema
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔄 Actualizando schema.prisma para usar @db.Timestamptz...');
    
    // Reemplazar todas las ocurrencias de DateTime que no tengan ya @db.Timestamptz
    // Patrones a buscar y reemplazar:
    
    // 1. DateTime con @default(now()) - agregar @db.Timestamptz
    schemaContent = schemaContent.replace(
      /DateTime\s+@default\(now\(\)\)/g,
      'DateTime @default(now()) @db.Timestamptz'
    );
    
    // 2. DateTime con @updatedAt - agregar @db.Timestamptz
    schemaContent = schemaContent.replace(
      /DateTime\s+@updatedAt/g,
      'DateTime @updatedAt @db.Timestamptz'
    );
    
    // 3. DateTime? (opcional) sin atributos - agregar @db.Timestamptz
    schemaContent = schemaContent.replace(
      /DateTime\?\s*$/gm,
      'DateTime? @db.Timestamptz'
    );
    
    // 4. DateTime sin atributos (final de línea) - agregar @db.Timestamptz
    schemaContent = schemaContent.replace(
      /DateTime\s*$/gm,
      'DateTime @db.Timestamptz'
    );
    
    // 5. DateTime con comentarios - agregar @db.Timestamptz antes del comentario
    schemaContent = schemaContent.replace(
      /DateTime(\s+\/\/.*$)/gm,
      'DateTime @db.Timestamptz$1'
    );
    
    // 6. DateTime? con comentarios - agregar @db.Timestamptz antes del comentario
    schemaContent = schemaContent.replace(
      /DateTime\?(\s+\/\/.*$)/gm,
      'DateTime? @db.Timestamptz$1'
    );
    
    // Limpiar duplicados que puedan haberse creado
    schemaContent = schemaContent.replace(
      /@db\.Timestamptz\s+@db\.Timestamptz/g,
      '@db.Timestamptz'
    );
    
    // Escribir el archivo actualizado
    fs.writeFileSync(schemaPath, schemaContent, 'utf8');
    
    console.log('✅ Schema actualizado exitosamente');
    console.log('📝 Todas las columnas DateTime ahora usan @db.Timestamptz');
    console.log('');
    console.log('🔍 Próximos pasos:');
    console.log('1. Ejecutar el script SQL: scripts/convert-to-timestamptz.sql');
    console.log('2. Ejecutar: npx prisma db pull (para sincronizar el schema)');
    console.log('3. Ejecutar: npx prisma generate (para regenerar el cliente)');
    
  } catch (error) {
    console.error('❌ Error actualizando el schema:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  updateSchemaFile();
}

module.exports = { updateSchemaFile };