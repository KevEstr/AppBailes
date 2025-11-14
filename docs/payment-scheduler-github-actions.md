# Sistema de Schedulers de Pago con GitHub Actions

Este documento explica cómo funciona el nuevo sistema de ejecución de schedulers de pago mediante GitHub Actions.

## Arquitectura

El sistema anterior utilizaba un scheduler interno basado en eventos y timeouts de Node.js. El nuevo sistema utiliza **GitHub Actions** para ejecutar los schedulers de forma más confiable y escalable.

## Componentes

### 1. Workflow de GitHub Actions
**Archivo:** `.github/workflows/execute-payment-schedulers.yml`

- **Frecuencia:** Se ejecuta cada hora solo en los días 1 y 16 de cada mes
- **Función:** Llama al endpoint `/api/cron/execute-payment-schedulers` para verificar y ejecutar schedulers pendientes
- **Autenticación:** Usa el secreto `CRON_SECRET` para autenticarse
- **Razón:** Los schedulers están configurados para ejecutarse en días específicos del mes (día 1 para corte 30, día 16 para corte 15)

### 2. Endpoint de Cron
**Archivo:** `app/api/cron/execute-payment-schedulers/route.ts`

- **Función:** 
  - Obtiene todos los schedulers activos
  - Filtra los que deben ejecutarse en el momento actual (basado en día, hora y minuto)
  - Ejecuta cada scheduler pendiente
  - Registra los resultados en `SchedulerExecution`
  - Actualiza estadísticas (totalSent, totalFailed, etc.)

### 3. Servicio de Scheduler
**Archivo:** `lib/payment-scheduler-service.ts`

- **Método público:** `executeSchedulerById(schedulerId)` - Ejecuta un scheduler específico
- **Lógica:** 
  - Crea período de pago si no existe
  - Genera pagos mensuales si no existen
  - Filtra estudiantes según cutoffGroup (15 o 30)
  - Envía mensajes de WhatsApp
  - Registra resultados

## Configuración

### Secrets de GitHub

Asegúrate de tener configurados estos secrets en GitHub:

1. **RAILWAY_PUBLIC_DOMAIN**: URL de tu aplicación en Railway
2. **CRON_SECRET**: Token secreto para autenticar las llamadas desde GitHub Actions

### Configuración del Scheduler

Cada scheduler se configura con:
- **Día del mes** (1-31): Día en que se ejecutará
- **Hora** (0-23): Hora de ejecución
- **Minuto** (0-59): Minuto de ejecución
- **Grupo de corte** (15 o 30): Filtra estudiantes según su día de corte

## Lógica de Ejecución

### Verificación de Tiempo

El endpoint verifica si un scheduler debe ejecutarse basándose en:

1. **Día del mes:** Debe coincidir con el día actual
2. **Hora:** Debe coincidir con la hora actual
3. **Minuto:** Debe estar en el rango de 0-15 minutos antes de la hora actual
   - Ejemplo: Si el workflow se ejecuta a las 9:15, ejecutará schedulers configurados para 9:00-9:15

### Prevención de Duplicados

El sistema evita ejecuciones duplicadas verificando:
- Si el scheduler ya se ejecutó hoy (`lastExecuted`)
- Solo permite una ejecución por día por scheduler

## Registro de Resultados

Cada ejecución crea un registro en `SchedulerExecution` con:
- **Status:** PENDING, RUNNING, COMPLETED, FAILED
- **totalMessages:** Total de mensajes a enviar
- **sentMessages:** Mensajes enviados exitosamente
- **failedMessages:** Mensajes que fallaron
- **startedAt:** Fecha/hora de inicio
- **completedAt:** Fecha/hora de finalización
- **errorMessage:** Mensaje de error si falló

## Reportes

Los resultados se pueden consultar desde:
- El dashboard de schedulers (`PaymentSchedulerDashboard`)
- La tabla `scheduler_executions` en la base de datos
- El endpoint `/api/admin/payment-scheduler` que incluye las ejecuciones

## Ventajas del Nuevo Sistema

1. **Confiabilidad:** GitHub Actions es más confiable que timeouts de Node.js
2. **Escalabilidad:** No consume recursos del servidor principal
3. **Trazabilidad:** Todos los logs están en GitHub Actions
4. **Mantenibilidad:** Fácil de monitorear y depurar
5. **Reportes:** Mejor registro de ejecuciones y resultados

## Monitoreo

### GitHub Actions
- Ve a la pestaña "Actions" en tu repositorio de GitHub
- Revisa el workflow "Execute Payment Schedulers"
- Verifica los logs de cada ejecución

### Dashboard
- El componente `PaymentSchedulerDashboard` muestra:
  - Estado de cada scheduler
  - Última ejecución
  - Próxima ejecución
  - Estadísticas (enviados, fallidos, tasa de éxito)

## Troubleshooting

### El scheduler no se ejecuta

1. Verifica que el scheduler esté activo (`isActive: true`)
2. Verifica que la fecha, hora y minuto coincidan
3. Revisa los logs de GitHub Actions
4. Verifica que `CRON_SECRET` esté configurado correctamente

### Mensajes no se envían

1. Revisa los logs de ejecución en `SchedulerExecution`
2. Verifica que los estudiantes tengan teléfono configurado
3. Verifica la configuración de WhatsApp en el sistema
4. Revisa los errores en `errorMessage` de la ejecución

### Ejecuciones duplicadas

- El sistema previene duplicados verificando `lastExecuted`
- Si ocurre, verifica que la fecha/hora del servidor sea correcta

