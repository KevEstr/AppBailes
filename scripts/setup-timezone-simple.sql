-- Script simple para configurar zona horaria de Colombia
-- Compatible con todas las versiones de PostgreSQL

-- Configurar zona horaria para la sesión actual
SET timezone = 'America/Bogota';

-- Verificar la configuración actual
SELECT current_setting('timezone') as current_timezone;

-- Función simple para obtener fecha actual en zona horaria de Colombia
CREATE OR REPLACE FUNCTION now_colombia()
RETURNS timestamp AS $$
BEGIN
    RETURN NOW();
END;
$$ LANGUAGE plpgsql;

-- Función para convertir timestamp a zona horaria de Colombia
CREATE OR REPLACE FUNCTION to_colombia_timezone(input_timestamp timestamp)
RETURNS timestamp AS $$
BEGIN
    RETURN input_timestamp AT TIME ZONE 'America/Bogota';
END;
$$ LANGUAGE plpgsql;

-- Verificar que las funciones se crearon correctamente
SELECT 
    proname as function_name,
    proargtypes::regtype[] as argument_types,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN ('now_colombia', 'to_colombia_timezone'); 