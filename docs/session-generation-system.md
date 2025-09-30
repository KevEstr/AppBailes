# Sistema de Generación Automática de Sesiones

## Problema Resuelto

Anteriormente, cuando se creaba una clase, se generaban automáticamente **24 sesiones** (8 semanas) y luego se detenía. Esto causaba que las clases tuvieran un número limitado de sesiones futuras.

## Solución Implementada

### 1. **Generación Inteligente de Sesiones**

- **Al crear una clase**: Solo se generan **2 semanas iniciales** de sesiones
- **Sistema automático**: Un cron job mantiene un buffer de **4 semanas** de sesiones futuras
- **Generación bajo demanda**: Se pueden generar sesiones manualmente cuando sea necesario

### 2. **Endpoints Disponibles**

#### Cron Job Automático
```
GET /api/cron/generate-sessions
```
- Se ejecuta automáticamente para mantener un buffer de sesiones
- Verifica que cada clase tenga al menos 4 semanas de sesiones futuras
- Solo genera las sesiones faltantes

#### Generación Manual
```
POST /api/admin/generate-sessions
{
  "classId": 123,
  "weeksToGenerate": 4
}
```

#### Estadísticas de Sesiones
```
GET /api/admin/generate-sessions?classId=123
```

### 3. **Configuración del Cron Job**

Para configurar el cron job automático, agrega esta línea a tu crontab:

```bash
# Ejecutar cada domingo a las 2:00 AM para generar sesiones de la próxima semana
0 2 * * 0 curl -X GET "https://tu-dominio.com/api/cron/generate-sessions" \
  -H "Authorization: Bearer TU_CRON_SECRET"
```

O en Vercel, configura un cron job en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/generate-sessions",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

### 4. **Variables de Entorno**

Agrega estas variables a tu `.env`:

```env
# Secret para proteger el endpoint de cron
CRON_SECRET=tu_secreto_super_seguro
```

### 5. **Beneficios del Nuevo Sistema**

1. **Eficiencia**: No genera sesiones innecesarias
2. **Escalabilidad**: Mantiene automáticamente un buffer de sesiones
3. **Flexibilidad**: Permite generación manual cuando sea necesario
4. **Rendimiento**: Reduce la carga inicial al crear clases
5. **Mantenimiento**: El sistema se auto-gestiona

### 6. **Monitoreo**

El sistema incluye logs detallados para monitorear:
- Cuántas sesiones se generan por clase
- Qué clases necesitan más sesiones
- Errores en la generación de sesiones

### 7. **Uso en Producción**

1. **Configura el cron job** para ejecutarse semanalmente
2. **Monitorea los logs** para asegurar que funciona correctamente
3. **Usa el endpoint manual** si necesitas generar sesiones inmediatamente
4. **Verifica las estadísticas** regularmente para mantener el sistema saludable

## Migración

Si ya tienes clases con sesiones limitadas, puedes:

1. **Ejecutar el cron job manualmente** para generar sesiones faltantes
2. **Usar el endpoint manual** para clases específicas
3. **Verificar las estadísticas** para ver el estado actual

El sistema es **retrocompatible** y no afecta las sesiones existentes.
