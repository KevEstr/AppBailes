# Scripts de Limpieza de Estudiantes

Este directorio contiene scripts para eliminar todos los datos de estudiantes de la base de datos.

## ⚠️ ADVERTENCIA IMPORTANTE

**Estos scripts eliminarán TODOS los datos de estudiantes de forma permanente. Esta acción NO se puede deshacer.**

### Datos que se eliminarán:
- Todos los usuarios con rol "STUDENT"
- Todos los registros de estudiantes
- Todos los datos de inscripción (`student_enrollment_data`)
- Todas las inscripciones a clases (`class_enrollments`)
- Todas las deudas (`debts`)
- Todos los recibos (`receipts`)
- Cualquier otro dato relacionado con estudiantes

## Scripts Disponibles

### 1. Script Completo (`clear-students.ts`)

**Comando:**
```bash
npm run clear:students
```

**Características:**
- Muestra estadísticas detalladas antes y después de la limpieza
- Elimina datos en orden específico para evitar problemas de foreign key
- Verificación completa de que todos los datos se eliminaron
- Logs detallados del proceso

### 2. Script Simple (`clear-students-simple.ts`)

**Comando:**
```bash
npm run clear:students:simple
```

**Características:**
- Usa las relaciones CASCADE del schema de Prisma
- Más rápido y simple
- Solo elimina usuarios con rol "STUDENT" y deja que CASCADE haga el resto
- Verificación básica

## Uso

### Antes de ejecutar:

1. **Hacer backup de la base de datos:**
   ```bash
   # Si usas PostgreSQL
   pg_dump your_database > backup_before_clear.sql
   
   # Si usas MySQL
   mysqldump your_database > backup_before_clear.sql
   ```

2. **Verificar que estás en el entorno correcto:**
   ```bash
   # Verificar variables de entorno
   echo $DATABASE_URL
   ```

3. **Ejecutar el script:**
   ```bash
   # Script completo (recomendado)
   npm run clear:students
   
   # O script simple
   npm run clear:students:simple
   ```

### Ejecución manual:

Si prefieres ejecutar los scripts directamente:

```bash
# Script completo
npx ts-node scripts/clear-students.ts

# Script simple
npx ts-node scripts/clear-students-simple.ts
```

## Verificación

Después de ejecutar el script, puedes verificar que todo se eliminó correctamente:

```bash
# Usar Prisma Studio para verificar
npm run db:studio
```

O ejecutar consultas directas:

```sql
-- Verificar que no quedan estudiantes
SELECT COUNT(*) FROM students;

-- Verificar que no quedan usuarios con rol STUDENT
SELECT COUNT(*) FROM users WHERE role = 'STUDENT';

-- Verificar que no quedan datos de inscripción
SELECT COUNT(*) FROM student_enrollment_data;
```

## Recuperación

Si necesitas recuperar datos después de ejecutar el script:

1. **Restaurar desde backup:**
   ```bash
   # PostgreSQL
   psql your_database < backup_before_clear.sql
   
   # MySQL
   mysql your_database < backup_before_clear.sql
   ```

2. **O ejecutar el seed nuevamente:**
   ```bash
   npm run db:seed
   ```

## Notas Técnicas

### Relaciones CASCADE

El script simple funciona porque el schema de Prisma tiene configuradas las relaciones con `onDelete: Cascade`:

```prisma
model Student {
  // ...
  enrollmentData StudentEnrollmentData?
  classEnrollments ClassEnrollment[]
  debts Debt[]
  receipts Receipt[]
  // ...
}
```

Cuando se elimina un `User` con rol "STUDENT", automáticamente se eliminan todos los registros relacionados.

### Orden de Eliminación

El script completo elimina en este orden para evitar problemas de foreign key:
1. Deudas (`debts`)
2. Recibos (`receipts`)
3. Inscripciones a clases (`class_enrollments`)
4. Datos de inscripción (`student_enrollment_data`)
5. Estudiantes (`students`)
6. Usuarios con rol "STUDENT" (`users`)

## Troubleshooting

### Error: "Foreign key constraint failed"
- Ejecuta el script completo en lugar del simple
- Verifica que no hay otras tablas con referencias a estudiantes

### Error: "Permission denied"
- Verifica que tienes permisos de escritura en la base de datos
- Asegúrate de que la conexión a la base de datos es correcta

### Error: "Cannot delete from table"
- Verifica que no hay transacciones activas
- Asegúrate de que no hay otros procesos usando la base de datos 