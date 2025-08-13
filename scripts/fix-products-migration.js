const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function fixProductsMigration() {
  try {
    console.log('🔄 Iniciando migración segura para el módulo de productos...');
    
    // Paso 1: Eliminar la vista temporalmente
    console.log('📋 Paso 1: Eliminando vista financial_transactions_view...');
    await prisma.$executeRaw`DROP VIEW IF EXISTS financial_transactions_view CASCADE`;
    console.log('✅ Vista eliminada correctamente');
    
    // Paso 2: Aplicar los cambios del schema
    console.log('📋 Paso 2: Aplicando cambios del schema...');
    try {
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Schema aplicado correctamente');
    } catch (error) {
      console.error('❌ Error al aplicar schema:', error.message);
      throw error;
    }
    
    // Paso 3: Recrear la vista
    console.log('📋 Paso 3: Recreando vista financial_transactions_view...');
    await prisma.$executeRaw`
      CREATE OR REPLACE VIEW financial_transactions_view AS
      SELECT 
        'monthly_payment' as transaction_type,
        mp.id as transaction_id,
        s.id as student_id,
        s.name as student_name,
        s.phone as student_phone,
        mp.amount as amount,
        mp.status as status,
        mp.payment_date as transaction_date,
        mp.created_at as created_at,
        mp.updated_at as updated_at,
        'Pago mensual' as description,
        mp.period as period,
        mp.payment_method as payment_method,
        mp.receipt_number as receipt_number,
        mp.notes as notes
      FROM monthly_payments mp
      JOIN students s ON mp.student_id = s.id
      
      UNION ALL
      
      SELECT 
        'service_payment' as transaction_type,
        so.id as transaction_id,
        s.id as student_id,
        s.name as student_name,
        s.phone as student_phone,
        so.total_amount as amount,
        CASE 
          WHEN so.status = 'PENDING' THEN 'PENDING'
          WHEN so.status = 'CONFIRMED' THEN 'PAID'
          WHEN so.status = 'IN_PROGRESS' THEN 'PENDING'
          WHEN so.status = 'COMPLETED' THEN 'PAID'
          WHEN so.status = 'CANCELLED' THEN 'FAILED'
          ELSE 'PENDING'
        END as status,
        so.created_at as transaction_date,
        so.created_at as created_at,
        so.updated_at as updated_at,
        CONCAT('Servicio: ', so.service_name) as description,
        NULL as period,
        so.payment_method as payment_method,
        so.receipt_number as receipt_number,
        so.notes as notes
      FROM service_orders so
      JOIN students s ON so.student_id = s.id
      
      UNION ALL
      
      SELECT 
        'enrollment_payment' as transaction_type,
        ep.id as transaction_id,
        s.id as student_id,
        s.name as student_name,
        s.phone as student_phone,
        ep.amount as amount,
        ep.status as status,
        ep.payment_date as transaction_date,
        ep.created_at as created_at,
        ep.updated_at as updated_at,
        'Pago de inscripción' as description,
        NULL as period,
        ep.payment_method as payment_method,
        ep.receipt_number as receipt_number,
        ep.notes as notes
      FROM enrollment_payments ep
      JOIN students s ON ep.student_id = s.id
      
      UNION ALL
      
      SELECT 
        'product_sale' as transaction_type,
        ps.id as transaction_id,
        NULL as student_id,
        'Venta de producto' as student_name,
        NULL as student_phone,
        ps.total_amount as amount,
        'PAID' as status,
        ps.sold_at as transaction_date,
        ps.created_at as created_at,
        ps.updated_at as updated_at,
        CONCAT('Venta: ', p.name, ' (', ps.quantity, ' unidades)') as description,
        NULL as period,
        'CASH' as payment_method,
        NULL as receipt_number,
        ps.notes as notes
      FROM product_sales ps
      JOIN products p ON ps.product_id = p.id
    `;
    console.log('✅ Vista recreada correctamente');
    
    // Paso 4: Generar el cliente de Prisma
    console.log('📋 Paso 4: Generando cliente de Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Cliente de Prisma generado correctamente');
    
    console.log('🎉 ¡Migración completada exitosamente!');
    console.log('📦 El módulo de productos está listo para usar.');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
fixProductsMigration()
  .then(() => {
    console.log('✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  });
