# Configuración de Cron Job en Railway

## Opción 1: Usar el servicio principal (Recomendado)

### 1. Configurar Variables de Entorno

En tu proyecto de Railway, agrega estas variables de entorno:

```env
CRON_SECRET=tu_secreto_super_seguro_aqui
```

### 2. Configurar el Cron Job

Railway detectará automáticamente el cron job desde el archivo `railway.json`:

```json
{
  "cron": {
    "generateSessions": {
      "schedule": "0 2 * * 0",
      "command": "curl -X GET \"$RAILWAY_PUBLIC_DOMAIN/api/cron/generate-sessions\" -H \"Authorization: Bearer $CRON_SECRET\""
    }
  }
}
```

### 3. Programación del Cron

- **`0 2 * * 0`**: Se ejecuta todos los domingos a las 2:00 AM
- **`0 0 * * *`**: Se ejecuta todos los días a medianoche
- **`0 0 1 * *`**: Se ejecuta el primer día de cada mes

## Opción 2: Servicio Dedicado (Alternativa)

### 1. Crear un Nuevo Servicio

1. En tu proyecto de Railway, haz clic en **"+ New"**
2. Selecciona **"Empty Service"**
3. Nombra el servicio: `session-generator`

### 2. Configurar el Servicio

1. **Source**: Conecta el mismo repositorio
2. **Build Command**: `npm install`
3. **Start Command**: `node scripts/generate-sessions-cron.js`

### 3. Configurar Variables de Entorno

En el servicio `session-generator`, agrega:

```env
CRON_SECRET=tu_secreto_super_seguro_aqui
RAILWAY_PUBLIC_DOMAIN=https://tu-dominio.railway.app
```

### 4. Configurar el Cron Schedule

1. Ve a **Settings** del servicio `session-generator`
2. En **Cron Schedule**, agrega: `0 2 * * 0`
3. Guarda la configuración

## Monitoreo y Logs

### Verificar que Funciona

1. **Logs del Cron Job**:
   - Ve a la pestaña **"Logs"** del servicio
   - Busca mensajes como "🚀 Iniciando generación automática de sesiones..."

2. **Logs de la API**:
   - Ve a los logs de tu aplicación principal
   - Busca mensajes como "🕐 Ejecutando cron job de generación de sesiones..."

### Ejecutar Manualmente (Para Pruebas)

```bash
# Desde tu terminal local
curl -X GET "https://tu-dominio.railway.app/api/cron/generate-sessions" \
  -H "Authorization: Bearer tu_secreto_super_seguro_aqui"
```

## Configuraciones de Horario Comunes

```bash
# Todos los domingos a las 2:00 AM (Recomendado)
0 2 * * 0

# Todos los días a las 3:00 AM
0 3 * * *

# Cada 6 horas
0 */6 * * *

# Los lunes y viernes a las 1:00 AM
0 1 * * 1,5

# El primer día de cada mes a medianoche
0 0 1 * *
```

## Solución de Problemas

### El Cron Job No Se Ejecuta

1. **Verifica las variables de entorno**:
   ```bash
   echo $CRON_SECRET
   echo $RAILWAY_PUBLIC_DOMAIN
   ```

2. **Revisa los logs**:
   - Busca errores de conexión
   - Verifica que la URL sea correcta

3. **Prueba manualmente**:
   ```bash
   curl -X GET "https://tu-dominio.railway.app/api/cron/generate-sessions" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

### El Servicio No Responde

1. **Verifica que la aplicación esté funcionando**:
   - Accede a `https://tu-dominio.railway.app/api/health`

2. **Revisa los logs de la aplicación**:
   - Busca errores en el endpoint `/api/cron/generate-sessions`

### Sesiones No Se Generan

1. **Verifica los logs del cron job**:
   - Busca mensajes de error específicos
   - Verifica que las clases estén activas

2. **Revisa la base de datos**:
   - Verifica que las clases tengan horarios activos
   - Comprueba que no haya errores de permisos

## Configuración Avanzada

### Múltiples Cron Jobs

Si necesitas múltiples cron jobs, puedes agregarlos al `railway.json`:

```json
{
  "cron": {
    "generateSessions": {
      "schedule": "0 2 * * 0",
      "command": "curl -X GET \"$RAILWAY_PUBLIC_DOMAIN/api/cron/generate-sessions\" -H \"Authorization: Bearer $CRON_SECRET\""
    },
    "cleanupOldSessions": {
      "schedule": "0 0 1 * *",
      "command": "curl -X POST \"$RAILWAY_PUBLIC_DOMAIN/api/cron/cleanup\" -H \"Authorization: Bearer $CRON_SECRET\""
    }
  }
}
```

### Notificaciones

Puedes agregar notificaciones cuando el cron job falle:

```javascript
// En el script de cron
if (response.status !== 200) {
  // Enviar notificación por email, Slack, etc.
  console.error('❌ Cron job falló');
  process.exit(1);
}
```

## Seguridad

1. **Usa un CRON_SECRET fuerte**:
   ```bash
   # Generar un secreto seguro
   openssl rand -base64 32
   ```

2. **No expongas el endpoint públicamente**:
   - El endpoint `/api/cron/generate-sessions` solo debe ser accesible con el token correcto

3. **Monitorea el acceso**:
   - Revisa los logs para detectar intentos de acceso no autorizados
