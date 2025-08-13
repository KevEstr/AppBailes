-- Vista consolidada de transacciones financieras con manejo de zona horaria
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
    'MONTHLY_PAYMENT' as source_table,
    id::text as transaction_id,
    "expectedAmount" as amount,
    CONCAT('Mensualidad - ', COALESCE(notes, 'Sin descripción')) as description,
    CASE 
        WHEN status = 'PAID' THEN 'INCOME'
        WHEN status = 'PENDING' THEN 'PENDING_LIABILITY'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'MONTHLY_PAYMENT' as category,
    "createdAt" as transaction_date,
    NULL as payment_method,
    "studentId" as student_id,
    "periodId"::text as period_id,
    NULL::text as related_id,
    NULL::text as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM monthly_payments
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'PAYMENT_PROOF' as source_table,
    id::text as transaction_id,
    amount,
    CONCAT('Comprobante de pago - ', "payerName") as description,
    CASE 
        WHEN status = 'APPROVED' THEN 'INCOME'
        WHEN status = 'PENDING' THEN 'PENDING_REVIEW'
        WHEN status = 'REJECTED' THEN 'EXPENSE'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'PAYMENT_PROOF' as category,
    "createdAt" as transaction_date,
    CASE 
      WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    NULL as student_id,
    NULL::text as period_id,
    "formId"::text as related_id,
    'PAYMENT_FORM' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM payment_proofs
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'ENROLLMENT_PAYMENT' as source_table,
    id::text as transaction_id,
    "expectedAmount" as amount,
    CONCAT('Pago de inscripción - ', sport::text) as description,
    CASE 
        WHEN status = 'PAID' THEN 'INCOME'
        WHEN status = 'PENDING' THEN 'PENDING_LIABILITY'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'ENROLLMENT_PAYMENT' as category,
    "createdAt" as transaction_date,
    NULL as payment_method,
    "studentId" as student_id,
    NULL::text as period_id,
    NULL::text as related_id,
    'ENROLLMENT' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM enrollment_payments
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'ENROLLMENT_PAYMENT_PROOF' as source_table,
    id::text as transaction_id,
    amount,
    CONCAT('Comprobante inscripción - ', COALESCE(concept, "payerName")) as description,
    CASE 
        WHEN status = 'APPROVED' THEN 'INCOME'
        WHEN status = 'PENDING' THEN 'PENDING_REVIEW'
        WHEN status = 'REJECTED' THEN 'EXPENSE'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'ENROLLMENT_PAYMENT_PROOF' as category,
    "createdAt" as transaction_date,
    CASE 
      WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    NULL as student_id,
    NULL::text as period_id,
    "formId"::text as related_id,
    'ENROLLMENT_FORM' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM enrollment_payment_proofs
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'SERVICE_PAYMENT' as source_table,
    id::text as transaction_id,
    amount,
    CONCAT('Pago de servicio - ', COALESCE(reference, notes, 'Sin descripción')) as description,
    CASE 
        WHEN status = 'PAID' THEN 'INCOME'
        WHEN status = 'PENDING' THEN 'PENDING_LIABILITY'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'SERVICE_PAYMENT' as category,
    "createdAt" as transaction_date,
    CASE 
      WHEN "paymentMethod" IS NOT NULL THEN "paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    NULL as student_id,
    NULL::text as period_id,
    "orderId"::text as related_id,
    'SERVICE_ORDER' as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM service_payments
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