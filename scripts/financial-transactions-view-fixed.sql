-- Vista consolidada de transacciones financieras con manejo correcto de zona horaria
CREATE OR REPLACE VIEW financial_transactions_view AS
SELECT 
    'RECEIPT' as source_table,
    r.id::text as transaction_id,
    r.amount,
    CONCAT(r.concept, ' - Estudiante: ', COALESCE(s.name, r."studentId")) as description,
    'INCOME' as transaction_type,
    'RECEIPT' as category,
    r."createdAt" as transaction_date,
    CASE 
      WHEN r."paymentMethod" IS NOT NULL THEN r."paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    r."studentId" as student_id,
    NULL::text as period_id,
    NULL::text as related_id,
    NULL::text as related_type,
    NULL::text as user_id,
    NULL::text as user_name,
    r."createdAt" as created_at,
    r."updatedAt" as updated_at
FROM receipts r
LEFT JOIN students s ON r."studentId" = s.id
WHERE r."createdAt" IS NOT NULL

UNION ALL

SELECT 
    'DEBT' as source_table,
    d.id::text as transaction_id,
    d.amount,
    CONCAT(d.concept, ' - Estudiante: ', COALESCE(s.name, d."studentId")) as description,
    'PENDING_LIABILITY' as transaction_type,
    'DEBT' as category,
    d."createdAt" as transaction_date,
    NULL as payment_method,
    d."studentId" as student_id,
    NULL::text as period_id,
    NULL::text as related_id,
    NULL::text as related_type,
    NULL::text as user_id,
    NULL::text as user_name,
    d."createdAt" as created_at,
    d."updatedAt" as updated_at
FROM debts d
LEFT JOIN students s ON d."studentId" = s.id
WHERE d."createdAt" IS NOT NULL

UNION ALL

SELECT 
    'MONTHLY_PAYMENT' as source_table,
    mp.id::text as transaction_id,
    COALESCE(mp."paidAmount", mp."expectedAmount") as amount,
    CONCAT('Mensualidad - ', COALESCE(mp.notes, 'Sin descripción'), ' - Estudiante: ', COALESCE(s.name, mp."studentId")) as description,
    CASE 
        WHEN mp.status = 'PAID' THEN 'INCOME'
        WHEN mp.status = 'PENDING' THEN 'PENDING_LIABILITY'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'MONTHLY_PAYMENT' as category,
    mp."createdAt" as transaction_date,
    NULL as payment_method,
    mp."studentId" as student_id,
    mp."periodId"::text as period_id,
    NULL::text as related_id,
    NULL::text as related_type,
    NULL::text as user_id,
    NULL::text as user_name,
    mp."createdAt" as created_at,
    mp."updatedAt" as updated_at
FROM monthly_payments mp
LEFT JOIN students s ON mp."studentId" = s.id
WHERE mp."createdAt" IS NOT NULL

UNION ALL

SELECT 
    'PAYMENT_PROOF' as source_table,
    pp.id::text as transaction_id,
    pp.amount,
    CONCAT('Comprobante de pago - ', COALESCE(pp."reviewNotes", 'Sin descripción'), ' - Estudiante: ', COALESCE(s.name, pf."studentId")) as description,
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
    NULL::text as user_id,
    NULL::text as user_name,
    pp."createdAt" as created_at,
    pp."updatedAt" as updated_at
FROM payment_proofs pp
JOIN payment_forms pf ON pp."formId" = pf.id
LEFT JOIN students s ON pf."studentId" = s.id
WHERE pp."createdAt" IS NOT NULL

UNION ALL

SELECT 
    'ENROLLMENT_PAYMENT' as source_table,
    ep.id::text as transaction_id,
    ep."expectedAmount" as amount,
    CONCAT('Pago de inscripción - ', ep.sport::text, ' - Estudiante: ', ep."studentId") as description,
    CASE 
        WHEN ep.status = 'PAID' THEN 'INCOME'
        WHEN ep.status = 'PENDING' THEN 'PENDING_LIABILITY'
        ELSE 'PENDING_REVIEW'
    END as transaction_type,
    'ENROLLMENT_PAYMENT' as category,
    ep."createdAt" as transaction_date,
    NULL as payment_method,
    ep."studentId" as student_id,
    NULL::text as period_id,
    NULL::text as related_id,
    NULL::text as related_type,
    NULL::text as user_id,
    NULL::text as user_name,
    ep."createdAt" as created_at,
    ep."updatedAt" as updated_at
FROM enrollment_payments ep
WHERE ep."createdAt" IS NOT NULL

UNION ALL

SELECT 
    'ENROLLMENT_PAYMENT_PROOF' as source_table,
    epp.id::text as transaction_id,
    epp.amount,
    CONCAT('Comprobante inscripción - ', COALESCE(epp."reviewNotes", 'Sin descripción'), ' - Estudiante: ', COALESCE(s.name, epf."studentId")) as description,
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
    NULL::text as user_id,
    NULL::text as user_name,
    epp."createdAt" as created_at,
    epp."updatedAt" as updated_at
FROM enrollment_payment_proofs epp
JOIN enrollment_payment_forms epf ON epp."enrollmentPaymentFormId" = epf.id
LEFT JOIN students s ON epf."studentId" = s.id
WHERE epp."createdAt" IS NOT NULL

UNION ALL

SELECT 
    'FINANCIAL_TRANSACTION' as source_table,
    ft.id::text as transaction_id,
    ft.amount,
    ft.description as description,
    ft.type::text as transaction_type,
    ft.category::text as category,
    ft.date as transaction_date,
    CASE 
      WHEN ft."paymentMethod" IS NOT NULL THEN ft."paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    ft."studentId" as student_id,
    ft."periodId"::text as period_id,
    ft."relatedId"::text as related_id,
    ft."relatedType" as related_type,
    NULL::text as user_id,
    NULL::text as user_name,
    ft.date as created_at,
    ft."updatedAt" as updated_at
FROM financial_transactions ft
WHERE ft."createdAt" IS NOT NULL

UNION ALL

SELECT 
    'PRODUCT_SALE' as source_table,
    ps.id::text as transaction_id,
    ps."totalAmount" as amount,
    CONCAT('Venta de producto - Usuario: ', u.email) as description,
    'INCOME' as transaction_type,
    'PRODUCT_SALE' as category,
    ps."soldAt" as transaction_date,
    CASE 
      WHEN ps."paymentMethod" IS NOT NULL THEN ps."paymentMethod"::text 
      ELSE NULL 
    END as payment_method,
    NULL as student_id,
    NULL::text as period_id,
    ps."productId"::text as related_id,
    'PRODUCT' as related_type,
    ps."processedBy"::text as user_id,
    u.email as user_name,
    ps."createdAt" as created_at,
    ps."updatedAt" as updated_at
FROM product_sales ps
LEFT JOIN users u ON ps."processedBy" = u.id
WHERE ps."createdAt" IS NOT NULL;