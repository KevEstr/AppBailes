const { PrismaClient } = require('@prisma/client');

async function checkColumns() {
  const prisma = new PrismaClient();
  
  try {
    // Obtener todas las columnas exactas
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'financial_transactions' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    console.log('Columnas exactas de financial_transactions:');
    result.forEach((row, index) => {
      console.log(`${index + 1}. "${row.column_name}"`);
    });
    
    // Verificar datos reales
    const sample = await prisma.$queryRaw`
      SELECT * FROM financial_transactions LIMIT 1
    `;
    
    console.log('\nEjemplo de datos:');
    console.log(sample[0]);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkColumns();