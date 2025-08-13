-- Vista consolidada de transacciones financieras con manejo correcto de zona horaria
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
    COALESCE("paidAmount", "expectedAmount") as amount,
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
    pp.id::text as transaction_id,
    pp.amount,
    CONCAT('Comprobante de pago - ', COALESCE(pp."reviewNotes", 'Sin descripción')) as description,
    CASE 
        WHEN pp.status = 'APPROVED' THEN 'INCOME'
        WHEN pp.status = 'PENDING' THEN 'PENDING_REVIEW'
        WHEN pp.status = 'REJECTED' THEN 'EXPENSE'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'PAYMENT_PROOF' as category,
    pp."createdAt" as transaction_date,
    CASE 
      WHEN pp."paymentMethod" IS NOT NULL THEN pp."paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    pf."studentId" as student_id,
    pf."periodId"::text as period_id,
    pp."formId"::text as related_id,
    'PAYMENT_FORM' as related_type,
    pp."createdAt" as created_at,
    pp."updatedAt" as updated_at
FROM payment_proofs pp
JOIN payment_forms pf ON pp."formId" = pf.id
WHERE pp."createdAt" IS NOT NULL

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
    NULL::text as related_type,
    "createdAt" as created_at,
    "updatedAt" as updated_at
FROM enrollment_payments
WHERE "createdAt" IS NOT NULL

UNION ALL

SELECT 
    'ENROLLMENT_PAYMENT_PROOF' as source_table,
    epp.id::text as transaction_id,
    epp.amount,
    CONCAT('Comprobante inscripción - ', COALESCE(epp."reviewNotes", 'Sin descripción')) as description,
    CASE 
        WHEN epp.status = 'APPROVED' THEN 'INCOME'
        WHEN epp.status = 'PENDING' THEN 'PENDING_REVIEW'
        WHEN epp.status = 'REJECTED' THEN 'EXPENSE'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'ENROLLMENT_PAYMENT_PROOF' as category,
    epp."createdAt" as transaction_date,
    CASE 
      WHEN epp."paymentMethod" IS NOT NULL THEN epp."paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    epf."studentId" as student_id,
    NULL::text as period_id,
    epp."formId"::text as related_id,
    'ENROLLMENT_FORM' as related_type,
    epp."createdAt" as created_at,
    epp."updatedAt" as updated_at
FROM enrollment_payment_proofs epp
JOIN enrollment_payment_forms epf ON epp."enrollmentPaymentFormId" = epf.id
WHERE epp."createdAt" IS NOT NULL

UNION ALL

SELECT 
    'SERVICE_PAYMENT' as source_table,
    sp.id::text as transaction_id,
    sp.amount,
    CONCAT('Pago de servicio - ', COALESCE(sp.notes, 'Sin descripción')) as description,
    CASE 
        WHEN sp.status = 'PAID' THEN 'INCOME'
        WHEN sp.status = 'PENDING' THEN 'PENDING_LIABILITY'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'SERVICE_PAYMENT' as category,
    sp."createdAt" as transaction_date,
    CASE 
      WHEN sp."paymentMethod" IS NOT NULL THEN sp."paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    so."studentId" as student_id,
    NULL::text as period_id,
    sp."orderId"::text as related_id,
    'SERVICE_ORDER' as related_type,
    sp."createdAt" as created_at,
    sp."updatedAt" as updated_at
FROM service_payments sp
JOIN service_orders so ON sp."orderId" = so.id
WHERE sp."createdAt" IS NOT NULL

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
    date as created_at,
    "updatedAt" as updated_at
FROM financial_transactions
WHERE "createdAt" IS NOT NULL;