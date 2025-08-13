# Configuración de Zona Horaria de Colombia

Este documento explica cómo configurar la zona horaria de Colombia en la aplicación para evitar problemas con fechas y horarios.

## Problema

Los registros se estaban guardando sin zona horaria específica, causando inconsistencias cuando se seleccionaban fechas específicas (ej: 7 de agosto mostraba registros del 6 de agosto).

## Solución

### 1. Configuración de Base de Datos

#### Ejecutar Scripts SQL

**Opción 1: Script automático (recomendado)**
```bash
# Ejecutar el script de configuración
chmod +x scripts/setup-timezone.sh
./scripts/setup-timezone.sh
```

**Opción 2: Script básico (si hay problemas con funciones)**
```sql
-- Conectar a PostgreSQL y ejecutar:
\i scripts/setup-timezone-basic.sql
\i scripts/financial-transactions-view.sql
```

**Opción 3: Script completo con funciones**
```sql
-- Conectar a PostgreSQL y ejecutar:
\i scripts/setup-timezone-simple.sql
\i scripts/financial-transactions-view.sql
```

#### Configuración de PostgreSQL

El script `setup-timezone.sql` configura:

- Zona horaria de la sesión: `America/Bogota`
- Funciones auxiliares para conversión de fechas
- Función para obtener fecha actual en zona horaria de Colombia

### 2. Vista SQL Actualizada

La vista `financial_transactions_view` ahora:

- Convierte todas las fechas a zona horaria de Colombia usando `AT TIME ZONE 'America/Bogota'`
- Maneja correctamente los timestamps sin zona horaria
- Asegura consistencia en todas las consultas

### 3. Utilidades de Fecha

Se creó `lib/date-utils.ts` con funciones:

- `toColombiaTime()`: Convierte fechas a zona horaria de Colombia
- `nowColombia()`: Obtiene fecha actual en zona horaria de Colombia
- `formatColombiaDate()`: Formatea fechas en formato colombiano
- `toColombiaISOString()`: Convierte a formato ISO para BD
- `createDayRange()`: Crea rango de fechas para un día específico

### 4. Frontend Actualizado

El componente `FinancialDashboard` ahora:

- Usa `toColombiaISOString()` para enviar fechas al backend
- Usa `formatColombiaDate()` para mostrar fechas
- Maneja correctamente los rangos de fecha

### 5. Backend Actualizado

La API `/api/admin/financial-reports` ahora:

- Aplica zona horaria de Colombia en las consultas SQL
- Usa `AT TIME ZONE 'America/Bogota'` en los filtros de fecha

## Verificación

Para verificar que la configuración funciona:

1. **Seleccionar una fecha específica** (ej: 7 de agosto)
2. **Verificar que solo aparezcan registros de esa fecha**
3. **Comprobar que las fechas se muestren en formato colombiano**

## Archivos Modificados

- `prisma/schema.prisma`: Agregada configuración de previewFeatures
- `scripts/setup-timezone.sql`: Script de configuración de zona horaria
- `scripts/financial-transactions-view.sql`: Vista actualizada con zona horaria
- `lib/date-utils.ts`: Utilidades para manejo de fechas
- `components/admin/FinancialDashboard.tsx`: Frontend actualizado
- `app/api/admin/financial-reports/route.ts`: Backend actualizado

## Notas Importantes

1. **Ejecutar los scripts SQL** antes de usar la aplicación
2. **Reiniciar la aplicación** después de los cambios
3. **Verificar la configuración** con fechas específicas
4. **Los registros existentes** mantendrán su zona horaria original

## Troubleshooting

### Error: "timezone does not exist"
```sql
-- Verificar que la zona horaria esté disponible
SELECT * FROM pg_timezone_names WHERE name LIKE '%Bogota%';
```

### Error: "type timestamp_without_time_zone does not exist"
```sql
-- Usar el script básico en su lugar
\i scripts/setup-timezone-basic.sql
```

### Error: "function does not exist"
```sql
-- Recrear las funciones
\i scripts/setup-timezone-simple.sql
```

### Fechas siguen mostrando problemas
1. Verificar que la vista se haya actualizado
2. Limpiar caché del navegador
3. Verificar que los scripts se ejecutaron correctamente 