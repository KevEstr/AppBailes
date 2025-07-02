# 🚀 Despliegue en Railway - AppBailes

Esta guía te ayudará a desplegar tu aplicación AppBailes en Railway usando Docker.

## 📋 Prerrequisitos

1. Cuenta en [Railway](https://railway.app)
2. Código dockerizado (ya completado ✅)
3. Variables de entorno configuradas

## 🔧 Paso 1: Configurar PostgreSQL en Railway

1. Ve a tu [Dashboard de Railway](https://railway.app/dashboard)
2. Crea un nuevo proyecto
3. Agrega un servicio de **PostgreSQL**:
   - Click en "Add Service" → "Database" → "PostgreSQL"
   - Railway creará automáticamente la base de datos

## 🚀 Paso 2: Desplegar la Aplicación

### Opción A: Desde GitHub (Recomendado)
1. Conecta tu repositorio de GitHub a Railway
2. Railway detectará automáticamente el `Dockerfile`
3. El build se iniciará automáticamente

### Opción B: Desde CLI
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login en Railway
railway login

# Inicializar proyecto
railway init

# Desplegar
railway up
```

## ⚙️ Paso 3: Configurar Variables de Entorno

En el dashboard de Railway, ve a tu servicio de aplicación y agrega estas variables:

### 🔐 Variables Obligatorias

⚠️ **IMPORTANTE**: Lee `RAILWAY_ENV_SETUP.md` para instrucciones detalladas.

**Resumen rápido**:
```env
DATABASE_URL=${{PostgreSQL.DATABASE_URL}}
NEXTAUTH_URL=https://tu-app.railway.app  
NEXTAUTH_SECRET=[genera con: openssl rand -base64 32]
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
NEXT_PUBLIC_BASE_URL=https://tu-app.railway.app
```

### 📱 Variables Opcionales (WhatsApp)

```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxx...
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_VERIFY_TOKEN=tu-verify-token-para-webhooks
WHATSAPP_APP_SECRET=tu-app-secret-de-meta

# Otros servicios
RESEND_API_KEY=re_xxxxxxxx
UPLOADTHING_SECRET=sk_live_xxxxxxxx
UPLOADTHING_APP_ID=xxxxxxxx
```

## 🗄️ Paso 4: Ejecutar Migraciones

Después del primer despliegue, ejecuta las migraciones de Prisma:

1. Ve a tu servicio en Railway
2. Abre la terminal (o usa Railway CLI)
3. Ejecuta:

```bash
npx prisma migrate deploy
npx prisma db seed
```

## 🔄 Paso 5: Configurar Dominio (Opcional)

1. En Railway, ve a tu servicio de aplicación
2. Click en "Settings" → "Domains"
3. Agrega tu dominio personalizado
4. Actualiza `NEXTAUTH_URL` y `NEXT_PUBLIC_BASE_URL` con tu nuevo dominio

## 📊 Monitoreo y Logs

- **Logs en tiempo real**: Railway Dashboard → tu servicio → "Logs"
- **Métricas**: Railway Dashboard → tu servicio → "Metrics"
- **Deployments**: Railway Dashboard → tu servicio → "Deployments"

## 🔧 Troubleshooting

### Error de conexión a base de datos
- Verifica que `DATABASE_URL` esté correctamente configurada
- Asegúrate de que el servicio de PostgreSQL esté funcionando

### Error de build de Docker
- Revisa los logs de build en Railway
- Verifica que el `Dockerfile` esté en la raíz del proyecto

### Error de Prisma
```bash
# En la terminal de Railway
npx prisma generate
npx prisma migrate deploy
```

### Variables de entorno faltantes
- Revisa que todas las variables obligatorias estén configuradas
- Verifica la sintaxis de las URLs

## 🚀 Automatización de Deployments

Railway se conecta automáticamente a tu repositorio de GitHub y despliega cada vez que haces push a la rama principal.

### Para configurar auto-deployment:
1. Conecta tu repo de GitHub
2. Railway detectará cambios automáticamente
3. Los deployments se ejecutarán en cada push

## 💡 Optimizaciones para Producción

1. **Monitoring**: Configura alertas en Railway
2. **Backups**: Railway hace backups automáticos de PostgreSQL
3. **Scaling**: Ajusta recursos según necesidad
4. **CDN**: Railway incluye CDN global automáticamente

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway Dashboard
2. Consulta la [documentación de Railway](https://docs.railway.app)
3. Contacta el soporte de Railway

---

¡Tu aplicación AppBailes estará lista en Railway! 🎉 