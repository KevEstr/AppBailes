-- ================================================
-- Unificar fechas a zona horaria de Colombia
-- - Convierte todas las columnas timestamp sin zona a timestamptz
-- - Asume que los datos guardados están en UTC (corrige +5h)
-- - Configura la BD para usar America/Bogota por defecto
-- ================================================

BEGIN;

-- 1) Fijar la zona horaria por defecto de la BASE DE DATOS a America/Bogota
DO $$
DECLARE
  dbname text := current_database();
BEGIN
  EXECUTE format('ALTER DATABASE %I SET TIME ZONE %L', dbname, 'America/Bogota');
END$$;

-- 2) Convertir todas las columnas timestamp without time zone -> timestamptz
--    Asumiendo que el valor actual representa UTC (por eso se ven +5h).
--    Si tus valores representan hora local de Colombia, cambia 'UTC' por 'America/Bogota'.
DO $conv$
DECLARE
  r record;
  v_input_zone text := 'UTC';              -- Cambia a 'America/Bogota' si tus datos son horas locales
  v_target_zone text := 'America/Bogota';  -- Zona objetivo para despliegue/operación
BEGIN
  RAISE NOTICE 'Convirtiendo columnas a timestamptz (interpretando datos como %)...', v_input_zone;

  FOR r IN
    SELECT
      c.table_schema,
      c.table_name,
      c.column_name
    FROM information_schema.columns c
    WHERE c.data_type = 'timestamp without time zone'
      AND c.table_schema NOT IN ('pg_catalog', 'information_schema')
  LOOP
    RAISE NOTICE '  Alterando %.%: %', r.table_schema, r.table_name, r.column_name;
    EXECUTE format(
      'ALTER TABLE %I.%I
         ALTER COLUMN %I TYPE timestamptz
         USING %I AT TIME ZONE %L',
      r.table_schema, r.table_name, r.column_name, r.column_name, v_input_zone
    );
  END LOOP;

  RAISE NOTICE 'Estableciendo zona horaria de la sesión a %', v_target_zone;
  EXECUTE format('SET TIME ZONE %L', v_target_zone);
END
$conv$;

COMMIT;

-- 3) (Opcional) Ver columnas afectadas y sus tipos resultantes
-- SELECT table_schema, table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE data_type = 'timestamp with time zone'
-- ORDER BY table_schema, table_name, column_name;