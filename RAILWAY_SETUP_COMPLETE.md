# ✅ Setup Completo para Railway - AppBailes

¡Problemas de build resueltos! Tu aplicación está lista para Railway.

## 🔧 Variables de Entorno para Railway

Copia estas variables **exactamente** en tu Railway Dashboard:

### 🔐 OBLIGATORIAS (6 variables)

```
DATABASE_URL
```
**Valor**: `${{PostgreSQL.DATABASE_URL}}`

```
NEXTAUTH_URL
```
**Valor**: `https://tu-app.railway.app` (cambiar por tu URL real)

```
NEXTAUTH_SECRET
```
**Valor**: Generar con `openssl rand -base64 32`

```
NODE_ENV
```
**Valor**: `production`

```
NEXT_TELEMETRY_DISABLED
```
**Valor**: `1`

```
NEXT_PUBLIC_BASE_URL
```
**Valor**: `https://tu-app.railway.app` (mismo que NEXTAUTH_URL)

### 📱 WHATSAPP (TUS CREDENCIALES REALES)

```
WHATSAPP_ACCESS_TOKEN
```
**Valor**: `EAATpgAlmqBMBO7E5pNEaXWZAIqui0Vc7gnrgYv5kD4hwVJNXeKcE7zjwQMAsyhOwxbMV1YJJKDUAlO8DNvws725TszDgwH2C01tnaR1IWKLZBshPUz1ZBrXdFQcCX4rZBHhHLhYzUzndLvJbQRrwaVMnUnA4r0J2O8ycUZCi4SGpsH7wphZC2uCWsGuynbIaf8iQaRE3LuOPo6Pt1ZC9UeLwttRxnaRw0IZD`

```
WHATSAPP_PHONE_NUMBER_ID
```
**Valor**: `671992555997755`

```
NEXT_PUBLIC_BASE_URL
```
**Valor**: `https://tu-app.railway.app` (para producción) o `http://localhost:3000` (para desarrollo)

### 🔧 ADICIONALES (TUS VALORES)

```
WT_SECRET
```
**Valor**: `secret-key`

```
WHATSAPP_VERIFY_TOKEN
```
**Valor**: `tu-verify-token-para-webhooks`

```
WHATSAPP_APP_SECRET
```
**Valor**: `tu-app-secret-de-meta`

```
RESEND_API_KEY
```
**Valor**: `re_xxxxxxxx`

```
UPLOADTHING_SECRET
```
**Valor**: `sk_live_xxxxxxxx`

```
UPLOADTHING_APP_ID
```
**Valor**: `xxxxxxxx`

## 🚀 Pasos para Desplegar

### 1. **Subir código a GitHub**
```bash
git add .
git commit -m "Fix WhatsApp build errors and add Railway setup"
git push
```

### 2. **En Railway**
1. Ve a [railway.app](https://railway.app)
2. Crea nuevo proyecto
3. Conecta tu repositorio de GitHub
4. Agrega servicio **PostgreSQL**
5. Configura las variables de entorno (mínimo las 6 obligatorias)

### 3. **Railway construirá automáticamente** usando tu Dockerfile

## ✅ Verificación Post-Deploy

Después del deploy, verifica en los logs de Railway:

- ✅ `🚀 Iniciando AppBailes en producción...`
- ✅ `✅ DATABASE_URL configurada correctamente`
- ✅ `📦 Generando Prisma Client...`
- ✅ `✅ Conexión a la base de datos exitosa`
- ✅ `🗄️ Ejecutando migraciones de base de datos...`
- ✅ `✅ Base de datos configurada correctamente`
- ✅ `🌟 Iniciando servidor Next.js...`

## 🛠️ Problemas Corregidos

- ✅ **Error de Prisma** (`DATABASE_URL undefined`) - Solucionado
- ✅ **Error de WhatsApp** (`WhatsApp credentials not configured`) - Solucionado
- ✅ **Build errors** - Variables de entorno para build time agregadas
- ✅ **Lazy initialization** - WhatsApp solo se inicializa cuando se usa
- ✅ **Script de inicio robusto** - Verificaciones y reintentos automáticos

## 📱 Funcionalidades de WhatsApp

Con las variables de WhatsApp configuradas, tendrás:

- ✅ Notificaciones de pago automáticas
- ✅ Confirmaciones de comprobantes aprobados/rechazados
- ✅ Recordatorios de mensualidades
- ✅ Mensajes masivos a estudiantes

## 🔧 Si algo falla

1. **Revisa logs en Railway**: Dashboard → tu servicio → "Logs"
2. **Variables obligatorias**: Asegúrate de tener las 6 variables mínimas
3. **URL correcta**: Verifica que NEXTAUTH_URL tenga tu URL real de Railway

---

**¡Tu app está lista para producción en Railway! 🎉** 