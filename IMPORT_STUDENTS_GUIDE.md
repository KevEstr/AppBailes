# 📚 Guía de Importación de Estudiantes desde CSV

Esta guía te ayudará a importar los datos de estudiantes desde el archivo CSV del formulario de afiliación de Paradise Dance Academy.

## 🎯 Características del Script

- ✅ **Creación automática de usuarios** con email y contraseña
- ✅ **Mapeo inteligente de instructores** del CSV a la base de datos
- ✅ **Creación automática de clases** basadas en horarios del CSV
- ✅ **Inscripción automática** de estudiantes en sus clases correspondientes
- ✅ **Manejo de campos nulos** y validación de datos
- ✅ **Prevención de duplicados** (no sobrescribe datos existentes)
- ✅ **Generación de emails únicos** basados en nombre + documento
- ✅ **Contraseñas seguras** usando el número de documento

## 📋 Preparación

### 1. Archivo CSV
Asegúrate de que el archivo CSV esté en la raíz del proyecto con el nombre:
```
Formato de afiliación Paradise Dance Academy (Respuestas) - Hoja 2.csv
```

### 2. Base de Datos
El script requiere que los instructores base ya existan. Ejecuta primero:
```bash
npm run db:seed-real
```

## 🚀 Ejecución

### Importar estudiantes desde CSV:
```bash
npm run import:students
```

## 📊 Mapeo de Datos

### Instructores Soportados
- `Karen Ospina (Baile Urbano)` → Karen Ospina
- `Luisa Machado Duque (Baile Urbano)` → Luisa Machado Duque

### Horarios de Clases Soportados
- **Karen Ospina:**
  - Miércoles y viernes 5:00 PM a 6:30 PM
  - Miércoles y viernes 6:30 PM a 8:00 PM
  - Martes y jueves 5:00 PM a 6:30 PM
  - Martes y jueves 6:30 PM a 8:00 PM
  - Sábados y domingos 10:00 AM a 11:30 AM

- **Luisa Machado Duque:**
  - Miércoles y viernes 3:30 PM a 5:00 PM
  - Miércoles y viernes 5:00 PM a 6:30 PM
  - Miércoles y viernes 6:30 PM a 8:00 PM

### Generación de Emails
El script genera emails únicos usando el formato:
```
[nombre.apellido].[numero.documento]@paradisedance.com
```

**Ejemplos:**
- `Ana María Pérez` + documento `1234567890` → `ana.maria.perez.1234567890@paradisedance.com`
- `José Luis García` + documento `0987654321` → `jose.luis.garcia.0987654321@paradisedance.com`

### Contraseñas
- **Contraseña**: Número de documento de identidad
- **Encriptación**: bcrypt con salt rounds = 12

## 📝 Estructura de Datos Importados

### Usuario (User)
```javascript
{
  email: "[nombre].[documento]@paradisedance.com",
  password: "[numero_documento_encriptado]",
  name: "[nombre_completo]",
  role: "TEACHER", // Por defecto
  isActive: true
}
```

### Estudiante (Student)
```javascript
{
  id: [numero_documento], // INT primary key
  name: "[nombre_completo]",
  email: "[email_generado]",
  phone: "[telefono]",
  isActive: true
}
```

### Datos de Inscripción (StudentEnrollmentData)
```javascript
{
  documentType: "[tipo_documento]",
  birthDate: "[fecha_nacimiento]",
  address: "[direccion]",
  neighborhood: "[barrio]",
  city: "Itagüí",
  hasSisben: Boolean,
  eps: "[eps]",
  bloodType: "[tipo_sangre]",
  hasRestrictions: Boolean,
  restrictionsDescription: "[restricciones]",
  medicalConditions: "[condiciones_medicas]",
  isAdult: Boolean,
  guardianName: "[nombre_acudiente]",
  guardianRelation: "[parentesco]",
  guardianPhone: "[telefono_acudiente]",
  monthlyFee: 50.00
}
```

## 🛡️ Validaciones y Manejo de Errores

### Validaciones Aplicadas
- ✅ **Número de documento**: Debe ser numérico válido
- ✅ **Teléfono**: Mínimo 10 dígitos, solo números
- ✅ **Instructor**: Debe existir en el mapeo
- ✅ **Horario**: Debe existir en el mapeo de clases
- ✅ **Email único**: No permite duplicados

### Manejo de Campos Nulos
- ❌ **Nombre vacío**: Se omite el registro
- ❌ **Documento vacío**: Se omite el registro
- ✅ **Otros campos**: Se asignan valores por defecto

### Prevención de Duplicados
- Si un estudiante ya existe (mismo documento), se omite la creación
- Si ya está inscrito en una clase, se omite la inscripción
- Logs informativos para cada caso

## 📊 Salida del Script

```bash
🌱 Iniciando importación de estudiantes desde CSV...
📊 Encontrados 95 estudiantes en el CSV
✅ Creado: Julieta Taborda Vélez (1022160162) - Email: julieta.taborda.velez.1022160162@paradisedance.com
📝 Inscrito estudiante 1022160162 en clase 1
...
🎉 ¡Importación completada!
📊 Resumen:
   ✅ Estudiantes creados: 89
   📝 Inscripciones realizadas: 89
   ❌ Errores: 6
   👤 Total usuarios: 105
   🎓 Total estudiantes: 93
   💃 Total clases: 12
```

## 🔧 Solución de Problemas

### Error: "Archivo CSV no encontrado"
```bash
# Verificar que el archivo esté en la raíz del proyecto
ls -la "Formato de afiliación Paradise Dance Academy (Respuestas) - Hoja 2.csv"
```

### Error: "Instructor no encontrado"
```bash
# Ejecutar seed de datos reales primero
npm run db:seed-real
```

### Error: "Número de documento inválido"
- El script omite registros con documentos no numéricos
- Verifica el CSV para identificar registros problemáticos

### Verificar resultados en base de datos:
```bash
# Abrir Prisma Studio
npm run db:studio
```

## 🔐 Credenciales Generadas

### Para estudiantes:
- **Email**: `[nombre].[documento]@paradisedance.com`
- **Contraseña**: Su número de documento

### Ejemplo de credenciales:
```
Email: julieta.taborda.velez.1022160162@paradisedance.com
Contraseña: 1022160162
```

## 📈 Siguientes Pasos

1. **Verificar importación**: Usar Prisma Studio para validar datos
2. **Notificar a estudiantes**: Enviar credenciales por WhatsApp/email
3. **Configurar roles**: Ajustar roles de usuario según necesidades
4. **Configurar pagos**: Establecer configuración de pagos mensuales

## ⚠️ Consideraciones Importantes

- **Ejecutar solo una vez**: El script está diseñado para importación inicial
- **Backup recomendado**: Hacer backup de la base de datos antes de ejecutar
- **Revisar logs**: Verificar todos los mensajes de error antes de continuar
- **Validar datos**: Revisar algunos registros manualmente después de la importación

## 🤝 Soporte

Si encuentras problemas durante la importación:
1. Revisar los logs del script para errores específicos
2. Verificar que el CSV esté en el formato correcto
3. Asegurar que la base de datos tenga los instructores base 