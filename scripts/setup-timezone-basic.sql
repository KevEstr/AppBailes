-- Script básico para configurar zona horaria de Colombia
-- Solo configura la zona horaria de la sesión

-- Configurar zona horaria para la sesión actual
SET timezone = 'America/Bogota';

-- Verificar la configuración actual
SELECT current_setting('timezone') as current_timezone;

-- Mostrar la fecha actual en la zona horaria configurada
SELECT NOW() as current_time_colombia; 