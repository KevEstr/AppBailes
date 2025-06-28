# 📅 Sistema de Envíos Programados de WhatsApp

Este sistema permite programar envíos automáticos de enlaces de pago por WhatsApp en intervalos específicos.

## 🚀 Características

- **Programación Flexible**: Configura fecha, hora e intervalo entre mensajes
- **Ejecución Automática**: Los envíos se ejecutan automáticamente en el tiempo programado
- **Progreso en Tiempo Real**: Monitorea el estado y progreso de cada envío
- **Gestión de Errores**: Manejo inteligente de fallos y reintentos
- **Intervalos Configurables**: Evita spam con intervalos entre mensajes (1-30 minutos)

## 📋 Cómo Usar

### 1. Programar un Envío

1. Ve al dashboard de pagos del período deseado
2. En la sección "Envíos Programados de WhatsApp", haz clic en "Programar Envío"
3. Completa el formulario:
   - **Nombre**: Identificador del envío (ej: "Recordatorio Mayo 2025")
   - **Fecha y Hora**: Cuándo debe ejecutarse
   - **Intervalo**: Tiempo entre mensajes (recomendado: 5 minutos)
4. Haz clic en "Programar Envío"

### 2. Monitorear Envíos

- **Pendiente**: El envío está programado y esperando la hora
- **Ejecutándose**: Los mensajes se están enviando actualmente
- **Completado**: Todos los mensajes fueron enviados
- **Fallido**: Hubo un error durante el envío
- **Cancelado**: El envío fue cancelado manualmente

### 3. Cancelar Envío

Solo los envíos con estado "Pendiente" pueden ser cancelados.

## ⚙️ Configuración Técnica

### Variables de Entorno

Agrega estas variables a tu `.env.local`:

```env
# Cron Job Security (Opcional)
CRON_SECRET="tu_clave_secreta_aqui"

# WhatsApp Configuration (Requerido)
WHATSAPP_ACCESS_TOKEN="tu_token_de_whatsapp"
WHATSAPP_PHONE_NUMBER_ID="tu_phone_number_id"
NEXT_PUBLIC_BASE_URL="https://tudominio.com"
```

### Configurar Cron Job Automático

#### Opción 1: Vercel Cron Jobs (Recomendado)

Si usas Vercel, crea `vercel.json` en la raíz del proyecto:

```json
{
  "crons": [
    {
      "path": "/api/cron/whatsapp-scheduler",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Esto ejecutará el cron cada 5 minutos.

#### Opción 2: Cron Job Externo

Configura un servicio externo para llamar:

```bash
# Cada 5 minutos
*/5 * * * * curl -X GET "https://tudominio.com/api/cron/whatsapp-scheduler" -H "Authorization: Bearer TU_CRON_SECRET"
```

#### Opción 3: GitHub Actions

Crea `.github/workflows/whatsapp-scheduler.yml`:

```yaml
name: WhatsApp Scheduler
on:
  schedule:
    - cron: '*/5 * * * *'  # Cada 5 minutos
  workflow_dispatch:      # Permite ejecución manual

jobs:
  run-scheduler:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger WhatsApp Scheduler
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/cron/whatsapp-scheduler" \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

#### Opción 4: Servidor Local/VPS

En tu servidor, configura crontab:

```bash
# Editar crontab
crontab -e

# Agregar línea (cada 5 minutos)
*/5 * * * * curl -X GET "https://tudominio.com/api/cron/whatsapp-scheduler" -H "Authorization: Bearer TU_CRON_SECRET"
```

## 🔧 APIs Disponibles

### 1. Gestión de Envíos Programados

```typescript
// Crear envío programado
POST /api/admin/scheduled-whatsapp
{
  "periodId": 1,
  "name": "Recordatorio Mayo",
  "scheduledDate": "2025-05-15T10:00:00Z",
  "intervalMinutes": 5
}

// Listar envíos programados
GET /api/admin/scheduled-whatsapp?periodId=1

// Actualizar envío programado
PUT /api/admin/scheduled-whatsapp/1
{
  "name": "Nuevo nombre",
  "status": "CANCELLED"
}

// Cancelar envío programado
DELETE /api/admin/scheduled-whatsapp/1
```

### 2. Ejecución Manual

```typescript
// Ejecutar envíos programados manualmente
POST /api/admin/scheduled-whatsapp/execute

// Cron job endpoint
GET /api/cron/whatsapp-scheduler
```

## 📊 Base de Datos

El sistema utiliza el modelo `ScheduledWhatsAppSend`:

```prisma
model ScheduledWhatsAppSend {
  id              Int                        @id @default(autoincrement())
  periodId        Int
  name            String
  scheduledDate   DateTime
  intervalMinutes Int                        @default(5)
  status          ScheduledWhatsAppStatus    @default(PENDING)
  totalMessages   Int                        @default(0)
  sentMessages    Int                        @default(0)
  failedMessages  Int                        @default(0)
  startedAt       DateTime?
  completedAt     DateTime?
  createdBy       String?
  createdAt       DateTime                   @default(now())
  updatedAt       DateTime                   @updatedAt
  period          PaymentPeriod              @relation(fields: [periodId], references: [id], onDelete: Cascade)
}
```

## 🎯 Casos de Uso

### Recordatorio Inicial
```
Nombre: "Recordatorio Inicial - Mayo 2025"
Fecha: 1 de Mayo 2025, 9:00 AM
Intervalo: 5 minutos
```

### Recordatorio de Vencimiento
```
Nombre: "Último Recordatorio - Mayo 2025"
Fecha: 28 de Mayo 2025, 6:00 PM
Intervalo: 2 minutos
```

### Envío de Madrugada
```
Nombre: "Envío Nocturno - Mayo 2025"
Fecha: 15 de Mayo 2025, 2:00 AM
Intervalo: 10 minutos
```

## 🛠️ Troubleshooting

### El cron no se ejecuta
1. Verifica que `NEXT_PUBLIC_BASE_URL` esté configurado correctamente
2. Confirma que el servicio de cron esté activo
3. Revisa los logs del servidor

### Mensajes no se envían
1. Verifica la configuración de WhatsApp (tokens, phone number ID)
2. Confirma que los estudiantes tengan números de teléfono válidos
3. Revisa el estado del envío programado

### Error de autorización en cron
1. Asegúrate de que `CRON_SECRET` esté configurado
2. Verifica que el header `Authorization` sea correcto

## 🔒 Seguridad

- Los cron jobs están protegidos con `CRON_SECRET`
- Solo administradores pueden crear envíos programados
- Los envíos en ejecución no pueden ser modificados
- Logs detallados para auditoría

## 📈 Monitoreo

- Estado en tiempo real en el dashboard
- Progreso de envío con porcentajes
- Contadores de éxito y errores
- Timestamps de inicio y finalización

¡El sistema está listo para automatizar tus envíos de WhatsApp! 🚀 