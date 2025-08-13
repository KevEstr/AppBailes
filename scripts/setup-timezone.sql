-- Script para configurar zona horaria de Colombia
-- Ejecutar este script en tu base de datos PostgreSQL

-- Configurar zona horaria para la sesión actual
SET timezone = 'America/Bogota';

-- Configurar zona horaria para la base de datos (requiere permisos de superusuario)
-- ALTER DATABASE your_database_name SET timezone TO 'America/Bogota';

-- Verificar la configuración actual
SELECT current_setting('timezone') as current_timezone;

-- Función para convertir fechas a zona horaria de Colombia
CREATE OR REPLACE FUNCTION to_colombia_timezone(timestamp)
RETURNS timestamp with time zone AS $$
BEGIN
    RETURN $1 AT TIME ZONE 'America/Bogota';
END;
$$ LANGUAGE plpgsql;

-- Función para obtener la fecha actual en zona horaria de Colombia
CREATE OR REPLACE FUNCTION now_colombia()
RETURNS timestamp with time zone AS $$
BEGIN
    RETURN NOW() AT TIME ZONE 'America/Bogota';
END;
$$ LANGUAGE plpgsql; 