-- Script para recrear la vista después de la conversión

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
    'DEBT' as source_table,
    id::text as transaction_id,
    amount,
    concept as description,
    'PENDING_LIABILITY' as transaction_type,
    'DEBT' as category,
    "createdAt" as transaction_date,
    NULL as payment_method,
    "studentId" as student_id,
    NULL::text as period_id,
    NULL::text as related_id,
    NULL::text as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM debts
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

SELECT '✅ Vista financial_transactions_view recreada correctamente' as view_status;