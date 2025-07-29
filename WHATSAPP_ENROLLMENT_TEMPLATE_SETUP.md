# 📱 Template de WhatsApp para Inscripciones - Paradise Dance Academy

## 🎯 Objetivo
Configurar el template profesional para notificar automáticamente a los usuarios cuando se completa su inscripción.

## 📋 Configuración en Meta for Developers

### 1. Acceder a Meta for Developers
1. Ve a https://developers.facebook.com/apps/
2. Selecciona tu aplicación
3. Ve a **WhatsApp > Message Templates**
4. Haz clic en **"Create Template"**

### 2. Configuración del Template

#### Información básica:
- **Template Name:** `enrollment_success_paradise`
- **Language:** Spanish (ES)
- **Category:** UTILITY
- **Template Type:** TEXT

#### Contenido del template:
```
¡INSCRIPCIÓN EXITOSA!

¡Hola! Nos complace informarte que la inscripción ha sido procesada exitosamente.

👤 Estudiante: {{1}}
🏃 Deporte: {{2}}
📝 Concepto: {{3}}
💰 Monto de inscripción: {{4}}
🔗 Enlace de pago: {{5}}

✅ ¡Bienvenido a Paradise!

Para completar el proceso:
1. Haz clic en el enlace de pago
2. Completa los datos requeridos
3. Sube el comprobante de pago
4. Recibirás confirmación inmediata

¿Dudas? Llámanos o escríbenos al {{6}}

¡Gracias por confiar en nosotros! ✨
```

### 3. Parámetros del Template
- **{{1}}** - Nombre del estudiante
- **{{2}}** - Deporte (Baile o Voleibol)
- **{{3}}** - Concepto (Inscripción Baile/Voleibol)
- **{{4}}** - Monto ($20,000)
- **{{5}}** - Enlace de pago
- **{{6}}** - Teléfono de contacto (automático según deporte)

### 4. Números de Contacto Automáticos
El sistema automáticamente usará:
- **Baile:** 3205656520
- **Voleibol:** 3128984535

## 🔄 Sistema de Fallback
Si el template no está aprobado, el sistema automáticamente:
1. Envía template `hello_world`
2. Espera 1 segundo
3. Envía mensaje completo con toda la información

## ✅ Verificación
Una vez configurado, el sistema enviará automáticamente el WhatsApp cuando:
1. Se registra un nuevo estudiante
2. Se selecciona deporte (Baile/Voleibol)
3. Se completa la inscripción

## 🚀 Prueba del Sistema
1. Ve a `/enrollment`
2. Registra un estudiante
3. Selecciona deporte
4. Completa la inscripción
5. **Automáticamente se enviará el WhatsApp**

## 📞 Soporte
Si necesitas ayuda con la configuración, contacta al administrador del sistema. 