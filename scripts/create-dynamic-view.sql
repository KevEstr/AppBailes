-- Vista dinámica que se adapta automáticamente a nuevas tablas de transacciones
CREATE OR REPLACE FUNCTION refresh_financial_view()
RETURNS void AS $$
BEGIN
    -- Eliminar vista existente
    DROP VIEW IF EXISTS financial_transactions_view CASCADE;
    
    -- Recrear vista con todas las tablas de transacciones
    EXECUTE '
    CREATE OR REPLACE VIEW financial_transactions_view AS
    SELECT 
        ''monthly_payment'' as transaction_type,
        mp.id as transaction_id,
        s.id as student_id,
        s.name as student_name,
        s.phone as student_phone,
        mp.amount as amount,
        mp.status as status,
        mp.payment_date as transaction_date,
        mp.created_at as created_at,
        mp.updated_at as updated_at,
        ''Pago mensual'' as description,
        mp.period as period,
        mp.payment_method as payment_method,
        mp.receipt_number as receipt_number,
        mp.notes as notes
    FROM monthly_payments mp
    JOIN students s ON mp.student_id = s.id
    
    UNION ALL
    
    SELECT 
        ''service_payment'' as transaction_type,
        so.id as transaction_id,
        s.id as student_id,
        s.name as student_name,
        s.phone as student_phone,
        so.total_amount as amount,
        CASE 
            WHEN so.status = ''PENDING'' THEN ''PENDING''
            WHEN so.status = ''CONFIRMED'' THEN ''PAID''
            WHEN so.status = ''IN_PROGRESS'' THEN ''PENDING''
            WHEN so.status = ''COMPLETED'' THEN ''PAID''
            WHEN so.status = ''CANCELLED'' THEN ''FAILED''
            ELSE ''PENDING''
        END as status,
        so.created_at as transaction_date,
        so.created_at as created_at,
        so.updated_at as updated_at,
        CONCAT(''Servicio: '', so.service_name) as description,
        NULL as period,
        so.payment_method as payment_method,
        so.receipt_number as receipt_number,
        so.notes as notes
    FROM service_orders so
    JOIN students s ON so.student_id = s.id
    
    UNION ALL
    
    SELECT 
        ''enrollment_payment'' as transaction_type,
        ep.id as transaction_id,
        s.id as student_id,
        s.name as student_name,
        s.phone as student_phone,
        ep.amount as amount,
        ep.status as status,
        ep.payment_date as transaction_date,
        ep.created_at as created_at,
        ep.updated_at as updated_at,
        ''Pago de inscripción'' as description,
        NULL as period,
        ep.payment_method as payment_method,
        ep.receipt_number as receipt_number,
        ep.notes as notes
    FROM enrollment_payments ep
    JOIN students s ON ep.student_id = s.id
    
    UNION ALL
    
    SELECT 
        ''product_sale'' as transaction_type,
        ps.id as transaction_id,
        NULL as student_id,
        ''Venta de producto'' as student_name,
        NULL as student_phone,
        ps.total_amount as amount,
        ''PAID'' as status,
        ps.sold_at as transaction_date,
        ps.created_at as created_at,
        ps.updated_at as updated_at,
        CONCAT(''Venta: '', p.name, '' ('', ps.quantity, '' unidades)'') as description,
        NULL as period,
        ''CASH'' as payment_method,
        NULL as receipt_number,
        ps.notes as notes
    FROM product_sales ps
    JOIN products p ON ps.product_id = p.id
    ';
    
    RAISE NOTICE 'Vista financial_transactions_view actualizada exitosamente';
END;
$$ LANGUAGE plpgsql;

-- Función para agregar nuevas tablas de transacciones automáticamente
CREATE OR REPLACE FUNCTION add_transaction_table_to_view(
    table_name TEXT,
    transaction_type TEXT,
    amount_column TEXT,
    date_column TEXT,
    description_template TEXT
)
RETURNS void AS $$
BEGIN
    -- Agregar la nueva tabla a la vista
    EXECUTE format('
        CREATE OR REPLACE VIEW financial_transactions_view AS
        SELECT * FROM financial_transactions_view
        UNION ALL
        SELECT 
            %L as transaction_type,
            id as transaction_id,
            NULL as student_id,
            %L as student_name,
            NULL as student_phone,
            %I as amount,
            ''PAID'' as status,
            %I as transaction_date,
            created_at,
            updated_at,
            %L as description,
            NULL as period,
            ''CASH'' as payment_method,
            NULL as receipt_number,
            notes
        FROM %I
    ', transaction_type, transaction_type, amount_column, date_column, description_template, table_name);
    
    RAISE NOTICE 'Tabla % agregada a la vista financial_transactions_view', table_name;
END;
$$ LANGUAGE plpgsql;
