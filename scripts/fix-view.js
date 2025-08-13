const { PrismaClient } = require('@prisma/client');

async function fixView() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Corrigiendo vista financiera...');
    
    // Eliminar vista existente
    await prisma.$executeRaw`DROP VIEW IF EXISTS financial_transactions_view CASCADE`;
    
    // Crear vista corregida con casting apropiado
    const createViewSQL = `
      CREATE OR REPLACE VIEW financial_transactions_view AS
      SELECT 
          'FINANCIAL_TRANSACTION' as source_table,
          id::text as transaction_id,
          amount,
          description,
          type::text as transaction_type,
          category::text as category,
          ("createdAt" AT TIME ZONE 'America/Bogota')::timestamp as transaction_date,
          CASE 
            WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
            ELSE NULL 
          END as payment_method,
          "studentId" as student_id,
          "periodId"::text as period_id,
          "relatedId"::text as related_id,
          "relatedType" as related_type,
          ("createdAt" AT TIME ZONE 'America/Bogota')::timestamp as created_at,
          ("updatedAt" AT TIME ZONE 'America/Bogota')::timestamp as updated_at
      FROM financial_transactions
      WHERE "createdAt" IS NOT NULL
      
      UNION ALL
      
      SELECT 
          'RECEIPT' as source_table,
          id::text as transaction_id,
          amount,
          concept as description,
          'INCOME' as transaction_type,
          'RECEIPT' as category,
          ("createdAt" AT TIME ZONE 'America/Bogota')::timestamp as transaction_date,
          CASE 
            WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
            ELSE NULL 
          END as payment_method,
          "studentId" as student_id,
          NULL::text as period_id,
          NULL::text as related_id,
          NULL::text as related_type,
          ("createdAt" AT TIME ZONE 'America/Bogota')::timestamp as created_at,
          ("updatedAt" AT TIME ZONE 'America/Bogota')::timestamp as updated_at
      FROM receipts
      WHERE "createdAt" IS NOT NULL;
    `;
    
    await prisma.$executeRawUnsafe(createViewSQL);
    
    console.log('✅ Vista corregida exitosamente');
    
    // Probar la vista
    const test = await prisma.$queryRaw`
      SELECT source_table, description, payment_method, transaction_date
      FROM financial_transactions_view 
      ORDER BY transaction_date DESC
      LIMIT 5
    `;
    
    console.log('📊 Datos de prueba:');
    test.forEach((row, i) => {
      const date = new Date(row.transaction_date).toLocaleString('es-CO');
      console.log(`${i+1}. ${row.source_table} - ${row.description} - ${row.payment_method || 'N/A'} - ${date}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixView();