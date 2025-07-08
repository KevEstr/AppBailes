# 🏐 Guía de Importación de Estudiantes de Voleibol

Esta guía detalla el proceso completo para importar estudiantes de voleibol desde un archivo CSV al sistema Paradise Dance Academy.

## 🎯 Resumen Ejecutivo

El script `import-volleyball-from-csv.ts` está diseñado para importar estudiantes de voleibol desde el archivo CSV oficial con estas características:

- ✅ **Creación automática de ubicaciones/canchas** si no existen
- ✅ **Soporte para tipos de documento especiales** (PEP - Permiso Especial de Permanencia)
- ✅ **Mapeo de parentescos complejos** incluyendo "Ambos" como padre/madre
- ✅ **Creación dinámica de instructores y clases** de voleibol
- ✅ **Validación exhaustiva de datos** antes de la importación

## 📋 Prerrequisitos

### Archivo CSV
Debe contener las siguientes columnas en este orden exacto:
1. `Cancha en la que entrenas.`
2. `Grupo de entrenamiento al que perteneces.`
3. `Nombres y apellidos del deportista`
4. `Tipo de documento`
5. `Numero del documento de identidad`
6. `Fecha de nacimiento`
7. `📲 Celular del deportista`
8. `Dirección de residencia`
9. `Barrio de residencia`
10. `SISBEN`
11. `EPS`
12. `Grupo sanguíneo`
13. `Presenta alguna restricción para practicar actividad física`
14. `Padece enfermedades o lesiones ¿cuáles?`
15. `Nombres y apellidos del acudiente`
16. `Parentesco`
17. `📲 Celular del acudiente`
18. `Reconocimiento de riesgos y exoneración de responsabilidad`

### Base de Datos
- ✅ Schema actualizado con soporte para `SportType.VOLLEYBALL`
- ✅ Modelo `SportLocation` para canchas
- ✅ Enum `UserRole.STUDENT` configurado
- ✅ IDs de tipo `BigInt` para documentos grandes

## 🏟️ Mapeo de Ubicaciones/Canchas

### Canchas Soportadas
El script reconoce y crea automáticamente estas ubicaciones:

```typescript
UBICACIONES_VOLEIBOL = {
  'Placa Cubierta de Puerto Bello': {
    nombre: 'Placa Cubierta de Puerto Bello',
    direccion: 'Puerto Bello, Bello'
  },
  'Placa Polideportiva del Carmen': {
    nombre: 'Placa Polideportiva del Carmen',
    direccion: 'El Carmen, Bello'
  },
  'Placa Deportiva del Mesa': {
    nombre: 'Placa Deportiva del Mesa',
    direccion: 'El Mesa, Bello'
  },
  'Placa Cubierta de Villas de Comfenalco': {
    nombre: 'Placa Cubierta de Villas de Comfenalco',
    direccion: 'Villas de Comfenalco, Bello'
  }
}
```

### Creación Automática
- Si una cancha no existe, se crea automáticamente
- Se usa el nombre como dirección por defecto
- Todas las canchas quedan activas (`isActive: true`)

## 👨‍🏫 Mapeo de Instructores

### Instructores de Voleibol
```typescript
INSTRUCTORES_VOLEIBOL = {
  'Angelica' → 'Angelica',
  'Antonia' → 'Antonia',
  'Andres Vera' → 'Andres Vera',
  'Andres Arroyave' → 'Andres Arroyave',
  'Andres' → 'Andres',
  'David' → 'David',
  'Camila' → 'Camila',
  'Yennifer' → 'Yennifer',
  'Santiago' → 'Santiago',
  'Jose' → 'Jose'
}
```

### Creación Automática de Instructores
Si un instructor no existe:
```typescript
{
  name: '[nombre_instructor]',
  email: '[nombre]@paradisevolleyball.com',
  phone: '3001234567', // Teléfono genérico
  isActive: true
}
```

## 🏐 Mapeo de Clases y Horarios

### Ejemplos de Horarios Soportados

#### Placa Cubierta de Puerto Bello
- `"Lunes, martes, jueves 3:30 Pm a 5:00 Pm (Camila)"`
- `"Lunes 3:30 Pm a 5:00 Pm, martes, jueves 5:00 Pm a 6:30 Pm (Yennifer)"`

#### Placa Polideportiva del Carmen
- `"Lunes, miércoles y viernes 2:30 Pm a 4:00 Pm (Angelica)"`
- `"Martes, jueves 4:00 Pm a 5:30 Pm y sábado 9:30 Am a 11:00 Am (David)"`
- `"MASCULINO - Lunes, martes y jueves 8:30 Pm a 10:00 Pm (Santiago)"`

#### Placa Deportiva del Mesa
- `"Lunes, martes y jueves 7:00 Pm a 8:30 Pm (Santiago)"`

#### Placa Cubierta de Villas de Comfenalco
- `"Martes, jueves 5:30 Pm a 7:00 Pm y sábado 9:30 Am a 11:00 Am (Andres)"`

### Creación Automática de Clases
```typescript
{
  name: '[horario_formateado]',
  description: 'Entrenamiento de voleibol con [instructor]',
  trainerId: [id_instructor],
  locationId: [id_cancha],
  sport: 'VOLLEYBALL',
  level: 'BEGINNER', // Nivel por defecto
  capacity: 20,
  price: 45.00, // Tarifa voleibol
  isActive: true
}
```

## 📄 Tipos de Documento

### Mapeo de Documentos
```typescript
TIPOS_DOCUMENTO = {
  'Tarjeta de identidad' → 'TI',
  'Cédula de ciudadanía' → 'CC',
  'Registro civil' → 'RC',
  'Permiso especial de permanencia' → 'PEP', // ⭐ NUEVO
  'Cédula de extranjería' → 'CE'
}
```

### Soporte para PEP
- ✅ **Frontend actualizado** con opción PEP
- ✅ **Validaciones** incluyen PEP como tipo válido
- ✅ **Mapeo automático** desde texto completo a código

## 👨‍👩‍👧‍👦 Mapeo de Parentescos

### Relaciones Familiares
```typescript
PARENTESCOS = {
  'Padre' → 'padre',
  'Madre' → 'madre',
  'Abuelo(a)' → 'abuelo',
  'Tío(a)' → 'tio',
  'Hermano(a)' → 'hermano',
  'Prima' → 'otro',
  'Ambos' → 'padre', // ⭐ Caso especial
  'Otro' → 'otro'
}
```

### Manejo de "Ambos"
Cuando el parentesco es "Ambos" (padre y madre):
- Se mapea a `'padre'` por defecto
- Se mantiene el nombre del acudiente como está
- Funcionalidad completa sin errores

## 👤 Generación de Usuarios

### Formato de Email
```typescript
email = `${numero_documento}@paradise.com`
```

### Ejemplos
- Documento `1033491825` → `1033491825@paradise.com`
- Documento `4858167` → `4858167@paradise.com`

### Contraseñas
- **Contraseña**: Número de documento de identidad
- **Encriptación**: bcrypt con salt rounds = 12

## 📊 Estructura de Datos Importados

### Usuario (User)
```typescript
{
  email: "[numero_documento]@paradise.com",
  password: "[documento_encriptado]",
  name: "[nombre_completo]",
  role: "STUDENT",
  isActive: true
}
```

### Estudiante (Student)
```typescript
{
  id: [numero_documento], // BigInt primary key
  name: "[nombre_completo]",
  email: "[email_generado]",
  phone: "[telefono_limpio]",
  isActive: true
}
```

### Datos de Voleibol (StudentEnrollmentData)
```typescript
{
  documentType: "[tipo_documento_mapeado]",
  birthDate: "[fecha_nacimiento_ISO]",
  address: "[direccion]",
  neighborhood: "[barrio]",
  city: "Bello", // Ciudad por defecto para voleibol
  hasSisben: Boolean,
  eps: "[eps]",
  bloodType: "[tipo_sangre]",
  hasRestrictions: Boolean,
  restrictionsDescription: "[restricciones]",
  medicalConditions: "[condiciones_medicas]",
  isAdult: Boolean, // Calculado por edad
  guardianName: "[acudiente]",
  guardianRelation: "[parentesco_mapeado]",
  guardianPhone: "[telefono_acudiente]",
  monthlyFee: 45.00 // Tarifa voleibol
}
```

### Inscripción en Clase (ClassEnrollment)
```typescript
{
  studentId: [id_estudiante],
  classId: [id_clase_voleibol],
  isActive: true,
  enrolledAt: [fecha_actual]
}
```

## ⚙️ Validaciones y Lógica

### Validaciones Críticas
- ✅ **Nombre obligatorio**: Sin nombre = registro omitido
- ✅ **Documento obligatorio**: Sin documento = registro omitido
- ✅ **Grupo de entrenamiento**: Sin horario = registro omitido
- ✅ **Teléfono válido**: Mínimo 10 dígitos, solo números
- ✅ **Instructor válido**: Debe existir en mapeo

### Cálculo de Edad
```typescript
function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  
  // Ajustar por mes y día
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age >= 18 ? age : 18 // Mínimo 18 para adultos
}
```

### Limpieza de Teléfonos
```typescript
function cleanPhone(phone: string): string {
  // Remover espacios, guiones, paréntesis
  let cleaned = phone.replace(/[\s\-\(\)\+]/g, '')
  // Remover prefijos 57 (Colombia)
  cleaned = cleaned.replace(/^57/, '').replace(/^3/, '3')
  return cleaned
}
```

### Formato de Fechas
```typescript
function formatDate(dateStr: string): string {
  // Convertir dd/mm/yyyy → yyyy-mm-dd
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    const year = parts[2]
    return `${year}-${month}-${day}`
  }
  return dateStr
}
```

## 🚀 Ejecutar la Importación

### Comando de Ejecución
```bash
npm run import:volleyball
```

### Prerrequisitos de Archivo
1. Colocar el CSV en la raíz del proyecto
2. Nombrar el archivo exactamente: `2024 Formato de afiliación Club Paradise Volleyball (Respuestas) - Hoja 3.csv`

### Proceso de Importación
1. **Lectura del CSV**: Parseo automático con detección de columnas
2. **Validación de datos**: Verificación de campos obligatorios
3. **Creación de ubicaciones**: Canchas nuevas si es necesario
4. **Creación de instructores**: Instructores nuevos si es necesario
5. **Creación de clases**: Clases nuevas si es necesario
6. **Creación de usuarios**: Con email y contraseña
7. **Creación de estudiantes**: Con datos básicos
8. **Datos de inscripción**: Información médica y familiar completa
9. **Inscripción en clases**: Asignación automática según horario

## 📊 Reporte de Resultados

### Métricas Mostradas
```bash
🎯 RESUMEN DE LA IMPORTACIÓN:
📊 Total de registros: [total_csv]
✅ Procesados exitosamente: [exitosos]
❌ Errores: [fallidos]

❌ ERRORES DETALLADOS:
   - Error en registro 5 (María García): Instructor no encontrado
   - Error en registro 12 (Sin nombre): Nombre faltante
```

### Logs Detallados
- ✅ **Procesamiento exitoso**: Nombre del estudiante y documento
- ⚠️ **Advertencias**: Registros omitidos con razón
- ❌ **Errores**: Fallos con descripción detallada
- 📝 **Creaciones**: Nuevas ubicaciones, instructores o clases

## 🛡️ Manejo de Errores

### Errores Comunes y Soluciones

#### Error: "Archivo CSV no encontrado"
```bash
Archivo CSV no encontrado: [ruta]
```
**Solución**: Verificar que el archivo existe y tiene el nombre exacto.

#### Error: "Instructor no encontrado en mapeo"
```bash
Instructor no encontrado en mapeo: [nombre_instructor]
```
**Solución**: Agregar el instructor al `INSTRUCTOR_MAPPING` en el script.

#### Error: "Horario no encontrado en mapeo"
```bash
Horario no encontrado en mapeo: [texto_horario]
```
**Solución**: Agregar el horario al `CLASS_SCHEDULE_MAPPING` en el script.

#### Error: "Documento demasiado largo para BigInt"
```bash
Document number [numero] too large for BigInt
```
**Solución**: Verificar que el número de documento es válido (máximo 19 dígitos).

### Registros Omitidos (No son errores)
- **Sin nombre**: Registro ignorado silenciosamente
- **Sin documento**: Registro ignorado silenciosamente  
- **Sin grupo de entrenamiento**: Registro ignorado con advertencia
- **Estudiante existente**: Registro omitido con mensaje informativo

## 🔧 Personalización

### Agregar Nuevos Instructores
```typescript
const INSTRUCTOR_MAPPING = {
  // ... instructores existentes
  'Nuevo Instructor': 'Nuevo Instructor'
}
```

### Agregar Nuevas Canchas
```typescript
const LOCATION_MAPPING = {
  // ... canchas existentes
  'Nueva Cancha': 'Nueva Cancha'
}
```

### Agregar Nuevos Horarios
```typescript
const CLASS_SCHEDULE_MAPPING = {
  // ... horarios existentes
  'Nuevo horario (Instructor)': {
    location: 'Cancha',
    instructor: 'Instructor',
    schedule: 'Horario formateado'
  }
}
```

### Modificar Tarifas
```typescript
// En createEnrollmentData()
monthlyFee: 45.00 // Cambiar valor aquí
```

## 🎉 Casos de Uso Exitosos

### Ejemplo 1: Estudiante Completo
```csv
"Placa Cubierta de Puerto Bello","Lunes, martes, jueves 3:30 Pm a 5:00 Pm (Camila)","Luciana Álvarez Ochoa","Tarjeta de identidad","1033491825","28/3/2009","3332770581","Cra. 57 #38-220","Santa Ana","No","Sura","A-","No","no","Nataly Ochoa Castillón","Madre","3054450834","Acepto"
```
**Resultado**: ✅ Usuario, estudiante, datos completos, inscripción en clase

### Ejemplo 2: Documento PEP
```csv
"Placa Polideportiva del Carmen","Martes, jueves 2:30 Pm a 4:00 Pm (Andres Vera)","Isabella Nicole Madriz","Permiso especial de permanencia","4858167","29/4/2011","3136274857","Carrera 59 calle 58-53","Buenos Aires","Si","Savia salud","O+","No","No","Wendy Carolina Medina","Madre","3206403168","Acepto"
```
**Resultado**: ✅ Tipo documento PEP mapeado correctamente

### Ejemplo 3: Parentesco "Ambos"
```csv
"Placa Deportiva del Mesa","Lunes, martes y jueves 7:00 Pm a 8:30 Pm (Santiago)","María ángel Velásquez","Tarjeta de identidad","1033497476","19/12/2014","3135332408","Unidad rincon del bosque","Trapiche","No","Sanitas","A+","No","No","Ryan-Mayra Velasquez","Ambos","3215030118","Acepto"
```
**Resultado**: ✅ "Ambos" mapeado a "padre"

## ⚠️ Consideraciones Importantes

### Limitaciones Técnicas
- **Documentos máximo 19 dígitos** (limitación BigInt de PostgreSQL)
- **Una sola clase por estudiante** (según horario del CSV)
- **Email único por documento** (sin validación de duplicados)

### Datos por Defecto
- **Ciudad**: "Bello" (para voleibol vs "Itagüí" para danza)
- **Precio clase**: $45.000 (vs $50.000 para danza)  
- **Nivel clase**: "BEGINNER" por defecto
- **Capacidad clase**: 20 estudiantes
- **Teléfono instructor**: "3001234567" genérico

### Recomendaciones
1. **Backup de BD**: Siempre hacer respaldo antes de importar
2. **Archivo limpio**: Verificar CSV sin caracteres especiales
3. **Nombres únicos**: Evitar duplicados de nombres de estudiantes
4. **Revisión post-importación**: Verificar datos en la interfaz

---

## 📞 Soporte

Para problemas durante la importación:

1. **Revisar logs detallados** en la consola
2. **Verificar mapeos** de instructores y horarios
3. **Comprobar formato CSV** y nombres de columnas
4. **Validar tipos de datos** (fechas, teléfonos, documentos)

¡La importación de voleibol está lista para usar! 🏐✨ 