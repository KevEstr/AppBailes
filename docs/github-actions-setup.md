# Configuración de GitHub Actions para Generación de Sesiones

## 🎯 **Configuración Completa**

### **1. Configurar Secrets en GitHub**

1. **Ve a tu repositorio en GitHub**
2. **Settings > Secrets and variables > Actions**
3. **Haz clic en "New repository secret"**
4. **Agrega este secret:**

```
Name: RAILWAY_PUBLIC_DOMAIN
Value: https://tu-dominio.railway.app
```

### **2. Verificar el Workflow**

El archivo `.github/workflows/generate-sessions.yml` ya está configurado con:

- ✅ **Cron Schedule**: `0 2 * * 0` (domingos a las 2:00 AM UTC)
- ✅ **Ejecución Manual**: `workflow_dispatch`
- ✅ **Logs Detallados**: Muestra el progreso y resultados

### **3. Probar el Workflow**

#### **Ejecutar Manualmente:**

1. **Ve a la pestaña "Actions"** en tu repositorio
2. **Selecciona "Generate Sessions"**
3. **Haz clic en "Run workflow"**
4. **Selecciona la rama y haz clic en "Run workflow"**

#### **Verificar Logs:**

1. **Haz clic en el workflow ejecutado**
2. **Haz clic en "generate-sessions"**
3. **Revisa los logs** para ver el progreso

### **4. Configuración de Horarios**

#### **Horarios Disponibles:**

```bash
# Todos los domingos a las 2:00 AM UTC (Recomendado)
0 2 * * 0

# Todos los días a las 3:00 AM UTC
0 3 * * *

# Cada 6 horas
0 */6 * * *

# Los lunes y viernes a las 1:00 AM UTC
0 1 * * 1,5

# El primer día de cada mes a medianoche UTC
0 0 1 * *
```

#### **Cambiar Horario:**

Edita el archivo `.github/workflows/generate-sessions.yml`:

```yaml
on:
  schedule:
    - cron: '0 3 * * *'  # Cambiar a todos los días a las 3:00 AM
```

### **5. Monitoreo y Logs**

#### **Ver Logs del Workflow:**

1. **Ve a Actions** en tu repositorio
2. **Selecciona "Generate Sessions"**
3. **Haz clic en el workflow ejecutado**
4. **Revisa los logs** para ver:
   - ✅ Cuántas sesiones se generaron
   - 📊 Resumen por clase
   - ⏱️ Tiempo de ejecución

#### **Logs Esperados:**

```
🚀 Iniciando generación automática de sesiones...
📡 URL: https://tu-dominio.railway.app/api/cron/sessions
📊 Status Code: 200
📄 Response: {"message":"Generación de sesiones completada exitosamente","totalSessionsGenerated":240}
✅ Generación de sesiones completada exitosamente
```

### **6. Solución de Problemas**

#### **El Workflow No Se Ejecuta:**

1. **Verifica que el secret esté configurado**:
   - Ve a Settings > Secrets and variables > Actions
   - Confirma que `RAILWAY_PUBLIC_DOMAIN` esté configurado

2. **Verifica que el archivo esté en la rama correcta**:
   - El archivo debe estar en la rama `main` o `master`

3. **Verifica la sintaxis del cron**:
   - Usa un validador de cron como [crontab.guru](https://crontab.guru/)

#### **Error 404 o 500:**

1. **Verifica que la URL sea correcta**:
   - Confirma que `RAILWAY_PUBLIC_DOMAIN` apunte a tu aplicación

2. **Verifica que el endpoint funcione**:
   ```bash
   curl -X GET "https://tu-dominio.railway.app/api/cron/sessions"
   ```

3. **Revisa los logs de Railway**:
   - Ve a los logs de tu aplicación en Railway
   - Busca errores en el endpoint `/api/cron/sessions`

#### **El Workflow Se Ejecuta Pero No Genera Sesiones:**

1. **Verifica que las clases estén activas**:
   - Revisa que las clases tengan `isActive: true`

2. **Verifica que las clases tengan horarios**:
   - Revisa que las clases tengan schedules activos

3. **Revisa los logs de Railway**:
   - Busca mensajes de error en la generación de sesiones

### **7. Configuración Avanzada**

#### **Múltiples Workflows:**

Puedes crear múltiples workflows para diferentes tareas:

```yaml
# .github/workflows/cleanup-sessions.yml
name: Cleanup Old Sessions

on:
  schedule:
    - cron: '0 0 1 * *'  # Primer día de cada mes

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Old Sessions
        run: |
          curl -X POST "${{ secrets.RAILWAY_PUBLIC_DOMAIN }}/api/cron/cleanup"
```

#### **Notificaciones:**

Puedes agregar notificaciones cuando el workflow falle:

```yaml
- name: Notify on Failure
  if: failure()
  run: |
    echo "❌ Workflow falló"
    # Aquí puedes agregar notificaciones por email, Slack, etc.
```

### **8. Ventajas de GitHub Actions**

1. ✅ **Gratis** - No consume recursos de Railway
2. ✅ **Confiable** - GitHub maneja la infraestructura
3. ✅ **Fácil de configurar** - Solo agregar un secret
4. ✅ **Logs detallados** - Fácil de monitorear
5. ✅ **Ejecución manual** - Puedes ejecutar cuando quieras
6. ✅ **Historial** - Puedes ver todas las ejecuciones

### **9. Configuración Final**

#### **Archivos Necesarios:**

- ✅ `.github/workflows/generate-sessions.yml` - Workflow principal
- ✅ `app/api/cron/sessions/route.ts` - Endpoint de generación
- ✅ `docs/github-actions-setup.md` - Esta documentación

#### **Secrets Necesarios:**

- ✅ `RAILWAY_PUBLIC_DOMAIN` - URL de tu aplicación en Railway

#### **Configuración del Endpoint:**

El endpoint `/api/cron/sessions` ya está configurado para:
- ✅ Generar sesiones automáticamente
- ✅ Mantener un buffer de 4 semanas
- ✅ Evitar duplicados
- ✅ Mostrar logs detallados

**¡Con esta configuración, tendrás sesiones infinitas automáticamente cada domingo a las 2:00 AM UTC!**
