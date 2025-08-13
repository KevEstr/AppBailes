const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function updateFinancialView() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Actualizando vista financiera...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'financial-transactions-view.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    await prisma.$executeRawUnsafe(sqlContent);
    
    console.log('✅ Vista financiera actualizada exitosamente');
    
    // Verificar que la vista funciona
    const testQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as total 
      FROM financial_transactions_view 
      WHERE source_table = 'FINANCIAL_TRANSACTION'
    `;
    
    console.log(`📊 Transacciones financieras en la vista: ${testQuery[0].total}`);
    
  } catch (error) {
    console.error('❌ Error actualizando la vista:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateFinancialView();