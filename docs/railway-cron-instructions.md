# Instrucciones para Configurar Cron Job en Railway

## Método 1: Usar Railway CLI (Recomendado)

### 1. Instalar Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Autenticarse

```bash
railway login
```

### 3. Conectar al Proyecto

```bash
railway link
```

### 4. Configurar Variables de Entorno

```bash
# Configurar el secreto para el cron job
railway variables set CRON_SECRET="tu_secreto_super_seguro_aqui"

# Verificar que se configuró
railway variables
```

### 5. Configurar el Cron Job

```bash
# Crear un cron job que se ejecute todos los domingos a las 2:00 AM
railway cron add "0 2 * * 0" "curl -X GET \"$RAILWAY_PUBLIC_DOMAIN/api/cron/generate-sessions\" -H \"Authorization: Bearer $CRON_SECRET\""
```

### 6. Verificar el Cron Job

```bash
# Listar todos los cron jobs
railway cron list

# Ver logs del cron job
railway logs --service cron
```

## Método 2: Usar la Interfaz Web de Railway

### 1. Acceder al Dashboard

1. Ve a [railway.app](https://railway.app)
2. Selecciona tu proyecto
3. Ve a la pestaña **"Variables"**

### 2. Configurar Variables de Entorno

Agrega estas variables:

```
CRON_SECRET=tu_secreto_super_seguro_aqui
```

### 3. Crear un Nuevo Servicio para Cron Job

1. Haz clic en **"+ New"**
2. Selecciona **"Empty Service"**
3. Nombra el servicio: `session-generator`

### 4. Configurar el Servicio

1. **Source**: Conecta el mismo repositorio
2. **Build Command**: `npm install`
3. **Start Command**: `node scripts/generate-sessions-cron.js`

### 5. Configurar el Cron Schedule

1. Ve a **Settings** del servicio `session-generator`
2. En **Cron Schedule**, agrega: `0 2 * * 0`
3. Guarda la configuración

## Método 3: Usar GitHub Actions (Alternativa)

### 1. Crear el Archivo de GitHub Actions

Crea `.github/workflows/generate-sessions.yml`:

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

## Pruebas y Verificación

### 1. Probar Localmente

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
export CRON_SECRET="test-secret"
export API_URL="http://localhost:3000"

# Ejecutar el script de prueba
node scripts/test-cron.js
```

### 2. Probar en Railway

```bash
# Ejecutar el cron job manualmente
railway run curl -X GET "$RAILWAY_PUBLIC_DOMAIN/api/cron/generate-sessions" -H "Authorization: Bearer $CRON_SECRET"
```

### 3. Verificar Logs

```bash
# Ver logs en tiempo real
railway logs --follow

# Ver logs específicos del cron job
railway logs --service session-generator
```

## Configuraciones de Horario

### Horarios Comunes

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

### Configurar Múltiples Cron Jobs

```bash
# Generar sesiones semanalmente
railway cron add "0 2 * * 0" "curl -X GET \"$RAILWAY_PUBLIC_DOMAIN/api/cron/generate-sessions\" -H \"Authorization: Bearer $CRON_SECRET\""

# Limpiar sesiones antiguas mensualmente
railway cron add "0 0 1 * *" "curl -X POST \"$RAILWAY_PUBLIC_DOMAIN/api/cron/cleanup\" -H \"Authorization: Bearer $CRON_SECRET\""
```

## Solución de Problemas

### El Cron Job No Se Ejecuta

1. **Verificar variables de entorno**:
   ```bash
   railway variables
   ```

2. **Verificar que el servicio esté funcionando**:
   ```bash
   railway status
   ```

3. **Revisar logs**:
   ```bash
   railway logs --service session-generator
   ```

### Error de Autenticación

1. **Verificar CRON_SECRET**:
   ```bash
   echo $CRON_SECRET
   ```

2. **Probar manualmente**:
   ```bash
   curl -X GET "https://tu-dominio.railway.app/api/cron/generate-sessions" \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

### El Servicio No Responde

1. **Verificar que la aplicación esté funcionando**:
   - Accede a `https://tu-dominio.railway.app/api/health`

2. **Revisar logs de la aplicación**:
   ```bash
   railway logs --service app
   ```

## Monitoreo

### Configurar Alertas

Puedes configurar alertas en Railway para monitorear:

1. **Fallos del cron job**
2. **Errores en la generación de sesiones**
3. **Problemas de conectividad**

### Dashboard de Monitoreo

Railway proporciona un dashboard donde puedes:

- Ver el estado de todos los servicios
- Revisar logs en tiempo real
- Monitorear el uso de recursos
- Ver el historial de ejecuciones del cron job

## Seguridad

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

### Configuración de Red

1. **Restringe el acceso al endpoint**:
   - El endpoint `/api/cron/generate-sessions` solo debe ser accesible con el token correcto

2. **Usa HTTPS**:
   - Railway proporciona HTTPS automáticamente
   - Asegúrate de que todas las comunicaciones sean seguras
