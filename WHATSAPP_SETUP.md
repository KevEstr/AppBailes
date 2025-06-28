# 📱 Configuración de WhatsApp Business API

Esta guía te ayudará a configurar el envío automático de enlaces de pago por WhatsApp usando la API de Meta (Facebook).

## 🚀 Pasos para configurar WhatsApp Business API

### 1. Crear una aplicación de Facebook

1. Ve a [Facebook Developers](https://developers.facebook.com/)
2. Haz clic en "My Apps" → "Create App"
3. Selecciona "Business" como tipo de aplicación
4. Completa la información básica de tu app

### 2. Agregar WhatsApp Business

1. En el dashboard de tu app, busca "WhatsApp" en la lista de productos
2. Haz clic en "Set up" para agregar WhatsApp Business
3. Completa el proceso de configuración inicial

### 3. Obtener credenciales

#### Phone Number ID
1. Ve a la sección "API Setup" en WhatsApp Business
2. Copia el **Phone Number ID** (se ve como: `123456789012345`)

#### Access Token
1. En la misma sección, encontrarás un **Temporary access token**
2. **IMPORTANTE**: Este token es temporal (24 horas)
3. Para producción, necesitas generar un **Permanent Access Token**:
   - Ve a "System Users" en Business Manager
   - Crea un system user para tu app
   - Asigna permisos de WhatsApp Business Management
   - Genera un token permanente

### 4. Configurar variables de entorno

Copia el archivo `env.example` a `.env.local` y completa:

```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN="EAAxxxxxxxxx..."
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
NEXT_PUBLIC_BASE_URL="https://tudominio.com"
```

### 5. Verificar número de teléfono

1. En la consola de WhatsApp Business, verifica tu número de teléfono
2. Sigue el proceso de verificación por SMS
3. Una vez verificado, podrás enviar mensajes

## 🔧 Configuración adicional (Opcional)

### Plantillas de mensajes

Para mensajes más profesionales, puedes crear plantillas aprobadas:

1. Ve a "Message Templates" en WhatsApp Business Manager
2. Crea una nueva plantilla para recordatorios de pago
3. Espera la aprobación de Meta (puede tomar 24-48 horas)
4. Actualiza el código para usar `sendPaymentTemplate()` en lugar de `sendPaymentMessage()`

### Webhooks (Para recibir respuestas)

Si quieres recibir respuestas de los usuarios:

1. Configura un webhook endpoint en tu aplicación
2. Agrega las URLs en la configuración de WhatsApp
3. Verifica el webhook con el verify token

## 🧪 Pruebas

### Modo de prueba

1. Inicialmente solo puedes enviar mensajes a números verificados
2. Agrega números de prueba en "Phone Numbers" → "Manage"
3. Verifica que los mensajes se envíen correctamente

### Modo producción

Para usar en producción:

1. Completa la Business Verification
2. Envía tu aplicación para review de Meta
3. Una vez aprobada, podrás enviar mensajes a cualquier número

## 📋 Checklist de configuración

- [ ] App de Facebook creada
- [ ] WhatsApp Business agregado
- [ ] Número de teléfono verificado
- [ ] Phone Number ID obtenido
- [ ] Access Token permanente generado
- [ ] Variables de entorno configuradas
- [ ] Pruebas realizadas con números verificados
- [ ] (Opcional) Plantillas de mensajes creadas
- [ ] (Opcional) Webhooks configurados

## 🔍 Troubleshooting

### Error: "WhatsApp credentials not configured"
- Verifica que las variables `WHATSAPP_ACCESS_TOKEN` y `WHATSAPP_PHONE_NUMBER_ID` estén en tu `.env.local`

### Error: "Invalid access token"
- El token puede haber expirado. Genera un nuevo token permanente
- Verifica que el token tenga los permisos correctos

### Error: "Phone number not verified"
- Completa el proceso de verificación en la consola de WhatsApp Business

### Error: "Cannot send message to this number"
- En modo de prueba, solo puedes enviar a números verificados
- Agrega el número a la lista de números de prueba

## 📞 Soporte

Si tienes problemas:

1. Revisa la [documentación oficial de WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
2. Verifica el status de tu aplicación en Facebook Developers
3. Revisa los logs de tu aplicación para errores específicos

## 🔒 Seguridad

- **NUNCA** compartas tu Access Token
- Usa variables de entorno para todas las credenciales
- Rota los tokens regularmente
- Implementa rate limiting para evitar spam 