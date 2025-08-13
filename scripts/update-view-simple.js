const { PrismaClient } = require('@prisma/client');

async function updateView() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Recreando vista financiera...');
    
    // Primero eliminar la vista si existe
    await prisma.$executeRaw`DROP VIEW IF EXISTS financial_transactions_view CASCADE`;
    
    // Crear la vista nueva con solo la parte de financial_transactions para probar
    const createViewSQL = `
      CREATE OR REPLACE VIEW financial_transactions_view AS
      SELECT 
          'RECEIPT' as source_table,
          id::text as transaction_id,
          amount,
          concept as description,
          'INCOME' as transaction_type,
          'RECEIPT' as category,
          ("createdAt" AT TIME ZONE 'America/Bogota')::timestamp as transaction_date,
          "paymentMethod" as payment_method,
          "studentId" as student_id,
          NULL::text as period_id,
          NULL::text as related_id,
          NULL::text as related_type,
          ("createdAt" AT TIME ZONE 'America/Bogota')::timestamp as created_at,
          ("updatedAt" AT TIME ZONE 'America/Bogota')::timestamp as updated_at
      FROM receipts
      WHERE "createdAt" IS NOT NULL
      
      UNION ALL
      
      SELECT 
          'FINANCIAL_TRANSACTION' as source_table,
          id::text as transaction_id,
          amount,
          description,
          type::text as transaction_type,
          category::text as category,
          ("createdAt" AT TIME ZONE 'America/Bogota')::timestamp as transaction_date,
          "paymentMethod"::text as payment_method,
          "studentId" as student_id,
          "periodId"::text as period_id,
          "relatedId"::text as related_id,
          "relatedType" as related_type,
          ("createdAt" AT TIME ZONE 'America/Bogota')::timestamp as created_at,
          ("updatedAt" AT TIME ZONE 'America/Bogota')::timestamp as updated_at
      FROM financial_transactions
      WHERE "createdAt" IS NOT NULL;
    `;
    
    await prisma.$executeRawUnsafe(createViewSQL);
    
    console.log('✅ Vista actualizada');
    
    // Probar la vista
    const test = await prisma.$queryRaw`
      SELECT source_table, transaction_type, payment_method, transaction_date
      FROM financial_transactions_view 
      WHERE source_table = 'FINANCIAL_TRANSACTION'
      ORDER BY transaction_date DESC
    `;
    
    console.log('📊 Datos de prueba:');
    test.forEach((row, i) => {
      console.log(`${i+1}. ${row.source_table} - ${row.transaction_type} - ${row.payment_method} - ${row.transaction_date}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateView();