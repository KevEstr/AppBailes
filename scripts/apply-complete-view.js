const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function applyCompleteView() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Aplicando vista completa...');
    
    const sql = fs.readFileSync('scripts/financial-transactions-view-fixed.sql', 'utf8');
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✅ Vista completa aplicada exitosamente');
    
    // Verificar que funciona
    const test = await prisma.$queryRaw`
      SELECT source_table, payment_method, transaction_date 
      FROM financial_transactions_view 
      WHERE source_table = 'FINANCIAL_TRANSACTION' 
      ORDER BY transaction_date DESC
    `;
    
    console.log('📊 Transacciones financieras:');
    test.forEach((row, i) => {
      const date = new Date(row.transaction_date).toLocaleString('es-CO');
      console.log(`${i+1}. ${row.payment_method || 'N/A'} - ${date}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

applyCompleteView();