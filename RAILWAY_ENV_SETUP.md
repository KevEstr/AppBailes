# 🔧 Configuración de Variables de Entorno para Railway

Después de crear tu proyecto en Railway y agregar PostgreSQL, configura estas variables de entorno:

## 🔐 Variables OBLIGATORIAS

Copia y pega cada una de estas variables en tu Railway Dashboard:

### 1. Base de Datos
```
DATABASE_URL
```
**Valor**: `${{PostgreSQL.DATABASE_URL}}`
📝 Railway automáticamente genera este valor cuando agregas PostgreSQL

### 2. NextAuth URL
```
NEXTAUTH_URL
```
**Valor**: `https://tu-app-name.railway.app` 
📝 Reemplaza `tu-app-name` con el nombre real de tu aplicación en Railway

### 3. NextAuth Secret
```
NEXTAUTH_SECRET
```
**Valor**: Genera uno usando: `openssl rand -base64 32`
📝 Ejemplo: `abc123def456ghi789jkl012mno345pqr678stu901vwx234yz`

### 4. Entorno de Producción
```
NODE_ENV
```
**Valor**: `production`

### 5. Telemetría
```
NEXT_TELEMETRY_DISABLED
```
**Valor**: `1`

### 6. URL Base Pública
```
NEXT_PUBLIC_BASE_URL
```
**Valor**: `https://tu-app-name.railway.app`
📝 Mismo valor que NEXTAUTH_URL

## 📱 Variables OPCIONALES (WhatsApp)

Solo agrega estas si vas a usar funcionalidades de WhatsApp:

### WhatsApp Business API (Meta)
```
WHATSAPP_ACCESS_TOKEN
```
**Valor**: Tu token de Meta (empieza con `EAA...`)

```
WHATSAPP_PHONE_NUMBER_ID
```
**Valor**: ID numérico de tu número de WhatsApp Business

### WhatsApp API Alternativa (UltraMsg)
```
WHATSAPP_API_URL
```
**Valor**: `https://api.ultramsg.com`

```
WHATSAPP_TOKEN
```
**Valor**: Tu token de UltraMsg

## 🔧 Variables ADICIONALES (Opcional)

### Para subida de archivos
```
UPLOADTHING_SECRET
```
**Valor**: Tu secret key de UploadThing

```
UPLOADTHING_APP_ID
```
**Valor**: Tu App ID de UploadThing

### Para emails
```
RESEND_API_KEY
```
**Valor**: Tu API key de Resend

### Para analytics
```
ANALYTICS_ID
```
**Valor**: Tu Google Analytics ID

## ✅ Verificación

Después de configurar las variables obligatorias, tu app debería tener al menos estas 6 variables:

1. ✅ `DATABASE_URL` = `${{PostgreSQL.DATABASE_URL}}`
2. ✅ `NEXTAUTH_URL` = `https://tu-app.railway.app`  
3. ✅ `NEXTAUTH_SECRET` = `[tu-secreto-generado]`
4. ✅ `NODE_ENV` = `production`
5. ✅ `NEXT_TELEMETRY_DISABLED` = `1`
6. ✅ `NEXT_PUBLIC_BASE_URL` = `https://tu-app.railway.app`

## 🚀 Orden de Configuración Recomendado

1. **Crear proyecto en Railway**
2. **Agregar servicio PostgreSQL** 
3. **Conectar repositorio de GitHub**
4. **Configurar las 6 variables obligatorias**
5. **Hacer deploy** (Railway lo hará automáticamente)
6. **Verificar logs** para asegurar que todo funciona

## 🔧 Solución de Problemas

### Error: "DATABASE_URL no está configurada"
- Verifica que agregaste PostgreSQL a tu proyecto
- Asegúrate de que `DATABASE_URL` tiene el valor `${{PostgreSQL.DATABASE_URL}}`

### Error: "Invalid NEXTAUTH_URL"
- Verifica que `NEXTAUTH_URL` y `NEXT_PUBLIC_BASE_URL` tengan la URL correcta de tu app
- Debe empezar con `https://` y terminar con `.railway.app`

### Error de build
- Revisa los logs en Railway Dashboard → tu servicio → "Logs"
- Asegúrate de que todas las variables obligatorias estén configuradas 