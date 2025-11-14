# Scripts de Validación de Faltas Consecutivas

Este directorio contiene scripts SQL para validar estudiantes con más de 3 faltas consecutivas en varias clases.

## Archivos

### 1. `validate-consecutive-absences.sql`
Script completo y detallado que identifica estudiantes con faltas consecutivas en múltiples clases.

**Características:**
- Calcula secuencias consecutivas de faltas por estudiante y clase
- Identifica estudiantes con faltas consecutivas en 2 o más clases diferentes
- Muestra información detallada: cédula, nombre, clases afectadas, total de faltas, fechas

**Uso:**
```sql
-- Ejecutar en tu cliente PostgreSQL (pgAdmin, DBeaver, psql, etc.)
\i scripts/validate-consecutive-absences.sql
```

### 2. `validate-consecutive-absences-simple.sql`
Script simplificado con múltiples consultas para diferentes vistas de los datos.

**Incluye 3 consultas:**
1. **Estudiantes con faltas en múltiples clases**: Solo muestra estudiantes que tienen faltas consecutivas en 2+ clases
2. **Todos los estudiantes con faltas consecutivas**: Lista completa de todas las secuencias de faltas consecutivas
3. **Resumen por deporte**: Estadísticas agrupadas por deporte (DANCE/VOLLEYBALL)

**Uso:**
```sql
-- Ejecutar cada consulta por separado o todas juntas
\i scripts/validate-consecutive-absences-simple.sql
```

## Criterios de Validación

Los scripts identifican:
- **Faltas consecutivas**: Faltas que ocurren en días consecutivos (diferencia ≤ 1 día)
- **Mínimo 3 faltas**: Solo cuenta secuencias de 3 o más faltas consecutivas
- **Último mes**: Analiza faltas del último mes desde la fecha actual
- **Estudiantes activos**: Solo incluye estudiantes con `isActive = true`

## Ejemplo de Resultado

```
Cédula    | Nombre          | Clases con Faltas | Clases Afectadas                    | Total Faltas
----------|-----------------|-------------------|-------------------------------------|-------------
123456789 | Juan Pérez      | 2                 | Baile Avanzado (DANCE): 4 faltas | 7
          |                 |                   | Voleibol Intermedio (VOLLEYBALL): 3 faltas |
```

## Notas Importantes

1. **Fechas**: Los scripts usan `CURRENT_DATE` como referencia. Ajusta el intervalo si necesitas otro período.

2. **Consecutividad**: Se considera consecutivo si la diferencia entre faltas es ≤ 1 día (incluye mismo día y día siguiente).

3. **Múltiples Clases**: Un estudiante aparece en el resultado si tiene faltas consecutivas en al menos 2 clases diferentes.

4. **Performance**: Los scripts usan CTEs (Common Table Expressions) y window functions que pueden ser lentos en tablas muy grandes. Considera agregar índices si es necesario.

## Modificar el Período de Análisis

Para cambiar el período de análisis, modifica esta línea en ambos scripts:

```sql
-- Cambiar de 1 mes a otro período
AND a.date >= CURRENT_DATE - INTERVAL '1 month'  -- Último mes
AND a.date >= CURRENT_DATE - INTERVAL '3 months'  -- Últimos 3 meses
AND a.date >= CURRENT_DATE - INTERVAL '6 months'  -- Últimos 6 meses
```

## Troubleshooting

Si no obtienes resultados:
1. Verifica que existan faltas (`status = 'ABSENT'`) en el período
2. Verifica que las fechas estén en el rango correcto
3. Verifica que los estudiantes estén activos (`isActive = true`)
4. Verifica que existan relaciones correctas entre `attendances`, `class_sessions` y `classes`


