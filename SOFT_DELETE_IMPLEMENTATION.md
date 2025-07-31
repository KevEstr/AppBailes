# Implementación de Soft Delete para Usuarios

## Resumen

Se ha implementado un sistema de soft delete para usuarios que permite "eliminar" usuarios sin perder la información relacionada. En lugar de eliminar físicamente los registros, se marcan como inactivos tanto el usuario como sus registros relacionados (estudiante o entrenador).

## Funcionalidades Implementadas

### 1. Soft Delete en API de Usuarios

**Archivo:** `app/api/users/[id]/route.ts`

- **Antes:** Eliminación física del usuario con `prisma.user.delete()`
- **Ahora:** Soft delete que marca como inactivos al usuario y sus registros relacionados

```typescript
// Implementar soft delete en una transacción
const result = await prisma.$transaction(async (tx) => {
  // Marcar el usuario como inactivo
  const updatedUser = await tx.user.update({
    where: { id: userId },
    data: { isActive: false }
  });

  // Si el usuario es un estudiante, marcar el estudiante como inactivo
  if (existingUser.student) {
    await tx.student.update({
      where: { userId: userId },
      data: { isActive: false }
    });
  }

  // Si el usuario es un entrenador, marcar el entrenador como inactivo
  if (existingUser.trainer) {
    await tx.trainer.update({
      where: { userId: userId },
      data: { isActive: false }
    });
  }

  return updatedUser;
});
```

### 2. Filtrado de Entrenadores Activos

**Archivos actualizados:**
- `components/class-management.tsx`
- `components/class-management-new.tsx`
- `app/admin/users/page.tsx`

Todos los componentes que cargan entrenadores ahora usan `?active=true` para asegurar que solo se muestren entrenadores activos en los formularios de creación/edición de clases.

### 3. API de Estudiantes Mejorada

**Archivo:** `app/api/students/route.ts`

Se agregó soporte para filtros de estado:
- `?active=true` - Solo estudiantes activos (por defecto)
- `?active=false` - Solo estudiantes inactivos
- `?active=all` - Todos los estudiantes (activos e inactivos)

### 4. API de Usuarios con Filtros

**Archivo:** `app/api/users/route.ts`

Se agregó soporte para filtros de estado:
- `?active=true` - Solo usuarios activos
- `?active=false` - Solo usuarios inactivos
- Sin parámetro - Todos los usuarios (activos e inactivos)

### 5. Interfaz de Administración Mejorada

**Archivo:** `app/admin/users/page.tsx`

- Se agregó un filtro de estado para mostrar usuarios activos/inactivos
- Se muestra un badge indicando el estado del usuario (Activo/Inactivo)
- Los usuarios inactivos se pueden seguir viendo y gestionando

## Comportamiento del Sistema

### Para Entrenadores
- **En formularios de clases:** Solo se muestran entrenadores activos
- **En gestión de usuarios:** Se pueden ver todos los entrenadores (activos e inactivos)
- **Al eliminar usuario:** Se marca como inactivo el entrenador relacionado

### Para Estudiantes
- **En formularios de inscripción:** Solo se muestran estudiantes activos
- **En gestión general:** Se pueden mostrar todos los estudiantes según el filtro
- **Al eliminar usuario:** Se marca como inactivo el estudiante relacionado

### Para Usuarios
- **En gestión de usuarios:** Se pueden ver todos los usuarios con filtros opcionales
- **Al eliminar:** Se marca como inactivo el usuario y sus registros relacionados
- **No se puede eliminar:** El usuario actual (protección)

## Script de Migración

**Archivo:** `scripts/fix-user-active-status.js`

Este script asegura que todos los usuarios existentes tengan el campo `isActive` configurado correctamente según el estado de sus registros relacionados.

### Uso:
```bash
node scripts/fix-user-active-status.js
```

## Ventajas del Soft Delete

1. **Preservación de datos:** No se pierde información histórica
2. **Auditoría:** Se mantiene el historial completo
3. **Recuperación:** Los usuarios pueden ser reactivados si es necesario
4. **Integridad referencial:** Se mantienen las relaciones entre tablas
5. **Flexibilidad:** Permite diferentes comportamientos según el contexto

## Consideraciones Técnicas

### Transacciones
Se utilizan transacciones de Prisma para asegurar que todas las operaciones de soft delete se ejecuten de manera atómica.

### Filtros por Defecto
- **Entrenadores:** Por defecto solo se muestran activos en formularios
- **Estudiantes:** Por defecto solo se muestran activos en formularios
- **Usuarios:** Por defecto se muestran todos (activos e inactivos)

### Validaciones
- No se puede eliminar el usuario actual
- Se valida que el usuario existe antes de proceder
- Se manejan errores de manera apropiada

## Próximos Pasos Recomendados

1. **Ejecutar el script de migración** para corregir estados existentes
2. **Probar el soft delete** con usuarios de prueba
3. **Verificar que los filtros funcionen** correctamente en todas las interfaces
4. **Considerar agregar funcionalidad de reactivación** de usuarios si es necesario
5. **Documentar el proceso** para otros desarrolladores del equipo 