const { PrismaClient } = require('@prisma/client');

async function applyColombianTimezone() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🇨🇴 Configurando zona horaria colombiana...');
    
    // 1. Configurar zona horaria para la sesión actual
    await prisma.$executeRaw`SET TIME ZONE 'America/Bogota'`;
    console.log('✅ Zona horaria de sesión configurada a America/Bogota');
    
    // 2. Verificar configuración actual
    const timezoneCheck = await prisma.$queryRaw`SELECT current_setting('TIMEZONE') as current_timezone`;
    console.log('🕐 Zona horaria actual:', timezoneCheck[0].current_timezone);
    
    // 3. Mostrar hora actual en diferentes formatos
    const timeCheck = await prisma.$queryRaw`
      SELECT 
        NOW() as utc_time,
        NOW() AT TIME ZONE 'America/Bogota' as colombia_time,
        EXTRACT(TIMEZONE FROM NOW()) as timezone_offset
    `;
    
    console.log('🕐 Tiempos actuales:');
    console.log('   UTC:', timeCheck[0].utc_time);
    console.log('   Colombia:', timeCheck[0].colombia_time);
    console.log('   Offset:', timeCheck[0].timezone_offset);
    
    // 4. Aplicar vista sin conversiones de zona horaria
    console.log('\n🔄 Aplicando vista financiera sin conversiones...');
    
    const viewSQL = `
      CREATE OR REPLACE VIEW financial_transactions_view AS
      SELECT 
          'RECEIPT' as source_table,
          id::text as transaction_id,
          amount,
          concept as description,
          'INCOME' as transaction_type,
          'RECEIPT' as category,
          "createdAt" as transaction_date,
          CASE 
            WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
            ELSE NULL 
          END as payment_method,
          "studentId" as student_id,
          NULL::text as period_id,
          NULL::text as related_id,
          NULL::text as related_type,
          "createdAt" as created_at,
          "updatedAt" as updated_at
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
          date as transaction_date,
          CASE 
            WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
            ELSE NULL 
          END as payment_method,
          "studentId" as student_id,
          "periodId"::text as period_id,
          "relatedId"::text as related_id,
          "relatedType" as related_type,
          "createdAt" as created_at,
          "updatedAt" as updated_at
      FROM financial_transactions
      WHERE "createdAt" IS NOT NULL;
    `;
    
    await prisma.$executeRawUnsafe(viewSQL);
    console.log('✅ Vista financiera aplicada sin conversiones de zona horaria');
    
    // 5. Probar los datos
    const testData = await prisma.$queryRaw`
      SELECT 
        source_table, 
        description, 
        transaction_date,
        payment_method
      FROM financial_transactions_view 
      ORDER BY transaction_date DESC
      LIMIT 3
    `;
    
    console.log('\n📊 Datos de prueba:');
    testData.forEach((row, i) => {
      const date = new Date(row.transaction_date);
      console.log(`${i+1}. ${row.source_table} - ${row.description}`);
      console.log(`   Fecha: ${date.toLocaleString('es-CO')}`);
      console.log(`   Método: ${row.payment_method || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

applyColombianTimezone();