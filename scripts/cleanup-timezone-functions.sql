-- Script para limpiar funciones de zona horaria manual 
-- Ejecutar DESPUÉS del script de configuración de zona horaria
-- Ya que la base de datos está configurada con 'America/Bogota', estas funciones son redundantes

-- ==============================================================
-- 1. ELIMINAR FUNCIONES REDUNDANTES DE ZONA HORARIA
-- ==============================================================

-- Eliminar función now_colombia() - ya no es necesaria porque NOW() usa la zona horaria configurada
DROP FUNCTION IF EXISTS now_colombia();

-- Eliminar función to_colombia_timezone() - ya no es necesaria porque los timestamps se manejan automáticamente
DROP FUNCTION IF EXISTS to_colombia_timezone(timestamp);

-- ==============================================================
-- 2. VERIFICACIÓN
-- ==============================================================

-- Verificar que las funciones fueron eliminadas
SELECT 
    'cleanup_check' as test_name,
    COUNT(*) as remaining_timezone_functions
FROM pg_proc 
WHERE proname IN ('now_colombia', 'to_colombia_timezone');

-- Verificar que la zona horaria sigue configurada correctamente
SELECT 
    'timezone_check' as test_name,
    current_setting('timezone') as current_timezone,
    NOW() as current_time_with_timezone;

-- Verificar que NOW() devuelve fecha en zona horaria de Colombia
SELECT 
    'new_record_test' as test_name,
    NOW() as now_function_result,
    'Las nuevas fechas se crearán automáticamente en zona horaria de Colombia' as status;

-- ✅ Limpieza completada
SELECT '✅ Funciones de zona horaria manual eliminadas correctamente' as cleanup_status;