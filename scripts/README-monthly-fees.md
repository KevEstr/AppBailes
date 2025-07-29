# Scripts de Actualización de Mensualidades

Este directorio contiene scripts para actualizar automáticamente las mensualidades de los estudiantes basándose en el tipo de deporte en el que están inscritos.

## 📁 Archivos

- `update-monthly-fees.js` - Versión JavaScript del script
- `update-monthly-fees.ts` - Versión TypeScript del script (recomendada)
- `README-monthly-fees.md` - Este archivo de documentación

## 🎯 Propósito

Los scripts actualizan el campo `monthlyFee` en la tabla `student_enrollment_data` basándose en las clases activas en las que está inscrito cada estudiante:

- **DANCE**: $60,000 COP
- **VOLLEYBALL**: $65,000 COP

## 🚀 Cómo Ejecutar

### Opción 1: JavaScript (Node.js)
```bash
cd scripts
node update-monthly-fees.js
```

### Opción 2: TypeScript (recomendado)
```bash
cd scripts
npx tsx update-monthly-fees.ts
```

### Opción 3: Con npm script (si está configurado)
```bash
npm run update-monthly-fees
```

## 📊 Lógica del Script

1. **Consulta inicial**: Obtiene todos los estudiantes que tienen datos de inscripción (`enrollmentData`)
2. **Filtrado**: Solo procesa estudiantes con inscripciones activas (`isActive: true`)
3. **Determinación de deporte**: 
   - Si el estudiante está inscrito en múltiples deportes, prioriza **DANCE** sobre **VOLLEYBALL**
   - Si solo está inscrito en un deporte, usa ese
4. **Actualización**: Solo actualiza si la mensualidad actual es diferente a la nueva
5. **Reporte**: Muestra un resumen detallado de la operación

## 📈 Salida del Script

El script muestra información detallada durante la ejecución:

```
🔄 Iniciando actualización de mensualidades...
📊 Encontrados 150 estudiantes con datos de inscripción

👤 Procesando estudiante: Juan Pérez (ID: 1234567890)
   💃 Deporte: DANCE - Mensualidad: $60,000
   ✅ Actualizado: $45,000 → $60,000

👤 Procesando estudiante: María García (ID: 9876543210)
   🏐 Deporte: VOLLEYBALL - Mensualidad: $65,000
   ✅ Actualizado: $50,000 → $65,000

🎯 RESUMEN DE LA ACTUALIZACIÓN:
📊 Total de estudiantes procesados: 150
✅ Actualizados exitosamente: 45
⏭️  Saltados (sin cambios necesarios): 100
❌ Errores: 5

🎉 ¡Actualización completada exitosamente!
```

## ⚠️ Consideraciones Importantes

### Antes de Ejecutar
1. **Backup**: Hacer una copia de seguridad de la base de datos
2. **Entorno**: Asegurarse de estar en el entorno correcto (desarrollo/producción)
3. **Variables de entorno**: Verificar que `DATABASE_URL` esté configurada correctamente

### Casos Especiales
- **Estudiantes sin inscripciones activas**: Se saltan automáticamente
- **Múltiples deportes**: Se prioriza DANCE sobre VOLLEYBALL
- **Mensualidad ya actualizada**: No se hace cambio si ya tiene el valor correcto
- **Errores individuales**: Se registran pero no detienen el proceso

### Después de Ejecutar
1. **Verificar**: Revisar el resumen final para confirmar los cambios
2. **Validar**: Comprobar algunos registros manualmente en la base de datos
3. **Notificar**: Informar a los administradores sobre los cambios realizados

## 🔧 Personalización

### Cambiar las Tarifas
Para modificar las tarifas, edita estas líneas en el script:

```typescript
if (primarySport === 'DANCE') {
  monthlyFee = 60000; // Cambiar este valor
} else if (primarySport === 'VOLLEYBALL') {
  monthlyFee = 65000; // Cambiar este valor
}
```

### Agregar Nuevos Deportes
Para agregar nuevos tipos de deporte:

1. Actualizar el enum `SportType` en `schema.prisma`
2. Agregar la lógica en el script:

```typescript
} else if (primarySport === 'NUEVO_DEPORTE') {
  monthlyFee = 70000; // Nueva tarifa
}
```

## 🐛 Solución de Problemas

### Error de Conexión a la Base de Datos
```bash
Error: connect ECONNREFUSED
```
**Solución**: Verificar que la base de datos esté ejecutándose y que `DATABASE_URL` sea correcta.

### Error de Permisos
```bash
Error: permission denied
```
**Solución**: Verificar que el usuario de la base de datos tenga permisos de escritura.

### Error de Prisma
```bash
Error: PrismaClientKnownRequestError
```
**Solución**: Ejecutar `npx prisma generate` para regenerar el cliente de Prisma.

## 📞 Soporte

Si encuentras problemas con los scripts:

1. Revisar los logs de error detallados
2. Verificar la estructura de la base de datos
3. Confirmar que todas las dependencias estén instaladas
4. Contactar al equipo de desarrollo si el problema persiste