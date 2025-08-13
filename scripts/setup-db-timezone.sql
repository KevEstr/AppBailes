-- Configurar zona horaria de Colombia en PostgreSQL
-- Ejecutar estos comandos en tu base de datos

-- 1. Configurar zona horaria de la sesión por defecto
ALTER DATABASE your_database_name SET timezone TO 'America/Bogota';

-- 2. Configurar zona horaria global (requiere privilegios de superusuario)
-- ALTER SYSTEM SET timezone TO 'America/Bogota';
-- SELECT pg_reload_conf();

-- 3. Verificar zona horaria actual
SELECT current_setting('TIMEZONE') as current_timezone;
SELECT NOW() as current_time_utc, NOW() AT TIME ZONE 'America/Bogota' as current_time_colombia;

-- 4. Configurar zona horaria para la sesión actual (temporal)
SET TIME ZONE 'America/Bogota';

-- 5. Mostrar todas las zonas horarias disponibles (opcional)
-- SELECT name FROM pg_timezone_names WHERE name LIKE '%Bogota%' OR name LIKE '%Colombia%';