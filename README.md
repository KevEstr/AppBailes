# 🕺💃 Academia de Bailes - Sistema de Gestión

Sistema completo de gestión para academias de baile con funcionalidades avanzadas.

## 🚀 Características

- **Asistencia TikTok**: Registro visual tipo TikTok
- **Recibos WhatsApp**: Envío automático de recibos
- **Mensajes Masivos**: Comunicación grupal
- **Control de Deudas**: Gestión de pagos pendientes
- **Historial Gráfico**: Análisis visual de asistencias

## 🛠️ Tecnologías

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de Datos**: PostgreSQL
- **UI**: shadcn/ui, Radix UI
- **Gráficos**: Recharts

## 📦 Instalación

1. **Clonar el repositorio**
\`\`\`bash
git clone <repository-url>
cd dance-academy-app
\`\`\`

2. **Instalar dependencias**
\`\`\`bash
npm install
\`\`\`

3. **Configurar base de datos**
\`\`\`bash
# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tu URL de PostgreSQL
# DATABASE_URL="postgresql://username:password@localhost:5432/dance_academy"
\`\`\`

4. **Configurar Prisma**
\`\`\`bash
# Generar cliente de Prisma
npm run db:generate

# Crear y aplicar migraciones
npm run db:migrate

# Poblar base de datos con datos de ejemplo
npm run db:seed
\`\`\`

5. **Ejecutar en desarrollo**
\`\`\`bash
npm run dev
\`\`\`

## 🗄️ Base de Datos

### Modelos Principales

- **Students**: Información de estudiantes
- **Attendance**: Registro de asistencias
- **Receipts**: Recibos de pago
- **Debts**: Deudas pendientes
- **MassiveMessages**: Mensajes masivos enviados
- **Trainers**: Información de entrenadores

### Comandos Útiles

\`\`\`bash
# Ver base de datos en navegador
npm run db:studio

# Resetear base de datos
npm run db:push --force-reset

# Crear nueva migración
npm run db:migrate
\`\`\`

## 🔧 API Endpoints

### Estudiantes
- `GET /api/students` - Listar estudiantes
- `POST /api/students` - Crear estudiante

### Asistencia
- `GET /api/attendance` - Asistencias del día
- `POST /api/attendance` - Registrar asistencia
- `GET /api/attendance-history` - Historial con gráficos

### Recibos
- `GET /api/receipts` - Listar recibos
- `POST /api/receipts` - Crear y enviar recibo

### Mensajes
- `POST /api/massive-messages` - Enviar mensajes masivos

### Deudas
- `GET /api/debts` - Listar deudas pendientes
- `POST /api/debt-reminder` - Enviar recordatorio individual
- `POST /api/massive-debt-reminders` - Enviar recordatorios masivos

## 📱 WhatsApp Integration

El sistema funciona completamente **SIN credenciales de WhatsApp**. Por defecto opera en modo simulación.

### Modo Simulación (Actual)
- ✅ Todas las funcionalidades funcionan
- ✅ Los mensajes se registran en la base de datos
- ✅ Se muestran como "enviados" en la interfaz
- 📝 Los mensajes se imprimen en la consola del servidor

### Para Habilitar WhatsApp Real (Opcional)
1. Obtener credenciales de WhatsApp Business API
2. Configurar variables de entorno:
   \`\`\`env
   WHATSAPP_TOKEN="tu_token_real"
   WHATSAPP_PHONE_NUMBER_ID="tu_phone_id"
   \`\`\`
3. Reiniciar el servidor
4. Los mensajes se enviarán por WhatsApp real automáticamente

### Verificar Estado
- **Simulación**: Console muestra "WhatsApp SIMULADO"
- **Real**: Console muestra "Enviando WhatsApp REAL"

## 🎨 Personalización

### Colores del Sistema
- **Recibos**: Verde esmeralda
- **Mensajes**: Azul índigo  
- **Asistencia**: Púrpura-rosa
- **Historial**: Naranja-rojo
- **Deudas**: Rojo-rosa

### Grupos de Estudiantes
- Grupo Principiantes
- Grupo Intermedio
- Grupo Avanzado
- Entrenamiento Físico
- Clases Particulares

## 🚀 Despliegue

### Vercel (Recomendado)
1. Conectar repositorio a Vercel
2. Configurar variables de entorno
3. Desplegar automáticamente

### Variables de Entorno Requeridas
\`\`\`env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
\`\`\`

## 📊 Funcionalidades Principales

### 1. Asistencia TikTok
- Vista de estudiante individual grande
- Navegación con flechas
- Registro rápido de estado
- Progreso visual

### 2. Sistema de Recibos
- Generación automática
- Envío por WhatsApp
- Gestión de promociones
- Historial completo

### 3. Mensajes Masivos
- Plantillas predefinidas
- Segmentación por grupos
- Envío automático
- Estadísticas de entrega

### 4. Control de Deudas
- Detección automática
- Recordatorios personalizados
- Envío masivo
- Seguimiento de pagos

### 5. Análisis Visual
- Gráficos de asistencia
- Estadísticas por estudiante
- Filtros por período
- Exportación de datos

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

Para soporte y preguntas:
- Crear un issue en GitHub
- Contactar al equipo de desarrollo

## Cloudinary Setup

Para el almacenamiento de comprobantes de pago en producción, se utiliza Cloudinary. Sigue estos pasos para configurarlo:

1. Crea una cuenta en [Cloudinary](https://cloudinary.com/)
2. Obtén las credenciales de tu cuenta (Cloud Name, API Key, API Secret)
3. Agrega las siguientes variables de entorno en tu archivo `.env`:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Los comprobantes de pago se almacenarán automáticamente en la carpeta `payment-proofs` de tu cuenta de Cloudinary.

---

**¡Hecho con ❤️ para academias de baile!** 🕺💃
