# Configuración Correcta de Cron Job en Railway

## ❌ Error Común
Railway CLI **NO** tiene comando `cron` directo. El comando `railway cron add` no existe.

## ✅ Solución Correcta: Usar la Interfaz Web

### Paso 1: Configurar Variables de Entorno

```bash
# Configurar el secreto para el cron job
railway variables set CRON_SECRET="tu_secreto_super_seguro_aqui"

# Verificar que se configuró
railway variables
```

### Paso 2: Crear Servicio Dedicado en Railway

1. **Ve a tu proyecto en Railway**
2. **Haz clic en "+ New"**
3. **Selecciona "Empty Service"**
4. **Nombra el servicio**: `session-generator`

### Paso 3: Configurar el Servicio

1. **Source**: Conecta el mismo repositorio
2. **Build Command**: `npm install`
3. **Start Command**: `node scripts/railway-cron.js`

### Paso 4: Configurar Variables del Servicio

En el servicio `session-generator`, agrega estas variables:

```
CRON_SECRET=tu_secreto_super_seguro_aqui
RAILWAY_PUBLIC_DOMAIN=https://tu-dominio.railway.app
```

### Paso 5: Configurar el Cron Schedule

1. **Ve a Settings del servicio `session-generator`**
2. **En la sección "Cron Schedule"**:
   - **Enable Cron**: ✅ Activado
   - **Schedule**: `0 2 * * 0` (domingos a las 2:00 AM)
3. **Guarda la configuración**

### Paso 6: Deshabilitar App Sleeping

1. **En Settings del servicio `session-generator`**
2. **Desactiva "App Sleeping"** (esto es crucial)
3. **Guarda la configuración**

## 🔧 Configuración Alternativa: Usar GitHub Actions

Si prefieres no usar un servicio dedicado, puedes usar GitHub Actions:

### 1. Crear `.github/workflows/generate-sessions.yml`

```yaml
name: Generate Sessions

on:
  schedule:
    # Ejecutar todos los domingos a las 2:00 AM UTC
    - cron: '0 2 * * 0'
  workflow_dispatch: # Permitir ejecución manual

jobs:
  generate-sessions:
    runs-on: ubuntu-latest
    
    steps:
      - name: Generate Sessions
        run: |
          curl -X GET "${{ secrets.RAILWAY_PUBLIC_DOMAIN }}/api/cron/generate-sessions" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### 2. Configurar Secrets en GitHub

Ve a **Settings > Secrets and variables > Actions** y agrega:

- `RAILWAY_PUBLIC_DOMAIN`: `https://tu-dominio.railway.app`
- `CRON_SECRET`: `tu_secreto_super_seguro_aqui`

## 🧪 Pruebas

### Probar Localmente

```bash
# Configurar variables
export CRON_SECRET="test-secret"
export RAILWAY_PUBLIC_DOMAIN="http://localhost:3000"

# Ejecutar el script
node scripts/railway-cron.js
```

### Probar en Railway

```bash
# Ejecutar manualmente en Railway
railway run node scripts/railway-cron.js
```

### Verificar Logs

```bash
# Ver logs del servicio de cron
railway logs --service session-generator

# Ver logs de la aplicación principal
railway logs --service app
```

## 📊 Monitoreo

### Verificar que Funciona

1. **Logs del Cron Job**:
   - Ve a la pestaña **"Logs"** del servicio `session-generator`
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

## ⚠️ Problemas Comunes

### El Cron Job No Se Ejecuta

1. **Verifica que "App Sleeping" esté desactivado**
2. **Revisa que el servicio tenga las variables correctas**
3. **Verifica que el schedule esté configurado correctamente**

### Error de Autenticación

1. **Verifica que CRON_SECRET esté configurado**
2. **Asegúrate de que la URL sea correcta**
3. **Prueba manualmente el endpoint**

### El Servicio No Responde

1. **Verifica que la aplicación principal esté funcionando**
2. **Revisa los logs de la aplicación**
3. **Asegúrate de que el endpoint `/api/cron/generate-sessions` esté disponible**

## 🎯 Configuraciones de Horario

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

## 🔒 Seguridad

### Mejores Prácticas

1. **Usa un CRON_SECRET fuerte**:
   ```bash
   # Generar un secreto seguro
   openssl rand -base64 32
   ```

2. **Rota el secreto periódicamente**:
   ```bash
   railway variables set CRON_SECRET="nuevo_secreto_super_seguro"
   ```

3. **Monitorea el acceso**:
   - Revisa los logs para detectar intentos de acceso no autorizados
   - Configura alertas para accesos sospechosos

## 📝 Resumen de Pasos

1. ✅ **Configurar variables**: `railway variables set CRON_SECRET="..."`
2. ✅ **Crear servicio dedicado**: `session-generator`
3. ✅ **Configurar build/start commands**
4. ✅ **Agregar variables al servicio**
5. ✅ **Configurar cron schedule**: `0 2 * * 0`
6. ✅ **Desactivar App Sleeping**
7. ✅ **Probar y monitorear**
