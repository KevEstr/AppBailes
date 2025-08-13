const { PrismaClient } = require('@prisma/client');

async function checkTableStructure() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando estructura de tabla financial_transactions...');
    
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'financial_transactions'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Columnas disponibles:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    // También verificar si hay datos
    const count = await prisma.$queryRaw`SELECT COUNT(*) as total FROM financial_transactions`;
    console.log(`📊 Total de registros: ${count[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure();