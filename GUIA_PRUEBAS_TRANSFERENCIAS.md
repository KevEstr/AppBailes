# 🧪 GUÍA DE PRUEBAS - Sistema de Transferencias

## 🚀 **PASO 1: INICIAR EL SISTEMA**

```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3000`

## 📋 **PASO 2: ACCEDER AL SISTEMA**

1. **Abrir navegador**: `http://localhost:3000`
2. **Iniciar sesión** como profesor o administrador
3. **Verificar** que el servidor esté funcionando correctamente

## 🎯 **PASO 3: PRUEBAS EN GESTIÓN DE CLASES**

### **Ubicación**: Menú → "Gestión de Clases" o "Classes"

#### **Prueba 1: Transferencia Básica**
```
1. Buscar una clase que tenga estudiantes inscritos
2. Hacer clic en "Ver Estudiantes"
3. En la lista, buscar un estudiante
4. Hacer clic en el botón → (flecha azul)
5. Se abre modal de transferencia
6. Seleccionar clase destino del dropdown
7. Opcionalmente escribir motivo
8. Hacer clic en "Confirmar Transferencia"
9. ✅ El estudiante debería desaparecer de la lista actual
```

#### **Prueba 2: Ver Historial**
```
1. En la misma lista de estudiantes
2. Hacer clic en el botón 📜 (historial)
3. Se abre modal con historial de transferencias
4. ✅ Verificar que se muestren las transferencias realizadas
```

#### **Prueba 3: Validaciones**
```
1. Intentar transferir a clase llena → Debería mostrar error
2. Intentar transferir a la misma clase → Debería mostrar error
3. Intentar transferir entre deportes diferentes → Debería mostrar error
```

## 🎯 **PASO 4: PRUEBAS EN ASISTENCIA TIKTOK**

### **Ubicación**: Menú → "Asistencia" o ir a `/attendance`

#### **Prueba 4: Transferencia desde Asistencia**
```
1. Seleccionar una clase activa
2. Hacer clic en "Comenzar Asistencia"
3. Navegar entre estudiantes
4. Cuando aparezca un estudiante, hacer clic en "Cambio"
5. Se abre modal de transferencia
6. Seleccionar nueva clase
7. Confirmar transferencia
8. ✅ El estudiante debería marcarse como "Cambio" en asistencia
9. ✅ El estudiante debería aparecer en la nueva clase
```

#### **Prueba 5: Flujo Completo de Asistencia**
```
1. Comenzar asistencia de una clase
2. Marcar algunos estudiantes como "Presente"
3. Marcar algunos como "Ausente"
4. Marcar algunos como "Tarde"
5. Marcar uno como "Cambio" y transferirlo
6. Completar la sesión
7. ✅ Verificar que el resumen muestre los cambios correctamente
```

## 🔍 **PASO 5: VERIFICACIONES TÉCNICAS**

### **Verificar Base de Datos**
```sql
-- Verificar que se creó la tabla de transferencias
SELECT * FROM student_transfers;

-- Verificar que las inscripciones se actualizaron
SELECT * FROM class_enrollments WHERE isActive = true;

-- Verificar que la asistencia se registró
SELECT * FROM attendances WHERE status = 'change_request';
```

### **Verificar API Endpoints**
```bash
# Probar endpoint de transferencias
curl -X POST http://localhost:3000/api/enrollments/transfer \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "123456789",
    "fromClassId": 1,
    "toClassId": 2,
    "reason": "Prueba de transferencia"
  }'

# Probar endpoint de historial
curl -X GET "http://localhost:3000/api/enrollments/transfer?studentId=123456789"
```

## 📊 **PASO 6: CASOS DE PRUEBA ESPECÍFICOS**

### **Caso 1: Transferencia Normal**
```
✅ Esperado: Estudiante se mueve de clase A a clase B
✅ Esperado: Se registra en historial
✅ Esperado: Asistencia se marca como "change_request"
```

### **Caso 2: Clase Llena**
```
✅ Esperado: Error "La clase destino ha alcanzado su capacidad máxima"
✅ Esperado: No se realiza la transferencia
✅ Esperado: Estudiante permanece en clase original
```

### **Caso 3: Mismo Deporte**
```
✅ Esperado: Solo se muestran clases del mismo deporte
✅ Esperado: No se puede transferir entre DANCE y VOLLEYBALL
```

### **Caso 4: Historial Completo**
```
✅ Esperado: Se muestran todas las transferencias del estudiante
✅ Esperado: Fechas, clases origen/destino, motivos
✅ Esperado: Usuario que realizó la transferencia
```

## 🐛 **PASO 7: PRUEBAS DE ERRORES**

### **Error 1: Sin Autenticación**
```
1. Cerrar sesión
2. Intentar acceder a transferencias
3. ✅ Debería redirigir a login
```

### **Error 2: Datos Inválidos**
```
1. Intentar transferir con datos faltantes
2. ✅ Debería mostrar errores de validación
```

### **Error 3: Estudiante No Existe**
```
1. Intentar transferir con ID de estudiante inválido
2. ✅ Debería mostrar error "Estudiante no encontrado"
```

## 📱 **PASO 8: PRUEBAS DE INTERFAZ**

### **Responsive Design**
```
1. Probar en móvil (F12 → Device Toolbar)
2. Verificar que los modales se vean bien
3. Verificar que los botones sean táctiles
4. ✅ Interfaz debería ser usable en móvil
```

### **Accesibilidad**
```
1. Navegar con teclado (Tab, Enter, Escape)
2. Verificar contraste de colores
3. Verificar que los botones tengan texto descriptivo
4. ✅ Debería ser accesible
```

## 🎉 **PASO 9: VERIFICACIÓN FINAL**

### **Checklist de Funcionalidades**
- [ ] Transferencia desde Gestión de Clases funciona
- [ ] Transferencia desde Asistencia TikTok funciona
- [ ] Historial de transferencias se muestra correctamente
- [ ] Validaciones funcionan (capacidad, deporte, etc.)
- [ ] Base de datos se actualiza correctamente
- [ ] Interfaz es responsive y accesible
- [ ] Errores se manejan apropiadamente
- [ ] Notificaciones (toasts) funcionan

### **Checklist de Integración**
- [ ] Sistema de transferencias integrado con gestión de clases
- [ ] Sistema de transferencias integrado con asistencia
- [ ] Historial disponible en ambos lugares
- [ ] Consistencia de datos entre módulos
- [ ] Performance aceptable

## 🚨 **PROBLEMAS COMUNES Y SOLUCIONES**

### **Problema 1: Modal no se abre**
```
Solución: Verificar que el componente StudentTransferModal esté importado
Solución: Verificar que las props se pasen correctamente
```

### **Problema 2: Error de tipos TypeScript**
```
Solución: Verificar que las interfaces sean compatibles
Solución: Ajustar tipos en StudentTransferModal
```

### **Problema 3: Base de datos no se actualiza**
```
Solución: Verificar que la migración se ejecutó correctamente
Solución: Verificar que las transacciones funcionen
```

### **Problema 4: API retorna errores**
```
Solución: Verificar logs del servidor
Solución: Verificar que el endpoint esté correctamente implementado
```

## 📞 **SOPORTE**

Si encuentras problemas durante las pruebas:

1. **Revisar logs** del servidor en la terminal
2. **Verificar consola** del navegador (F12)
3. **Comprobar base de datos** directamente
4. **Revisar documentación** en `STUDENT_TRANSFER_SYSTEM.md`

---

## 🎯 **RESUMEN DE PRUEBAS**

El sistema de transferencias debe permitir:

1. **Transferir estudiantes** desde gestión de clases
2. **Transferir estudiantes** desde asistencia TikTok
3. **Ver historial** de todas las transferencias
4. **Validar** capacidad, deporte, y otros criterios
5. **Mantener consistencia** de datos
6. **Proporcionar feedback** claro al usuario

¡Todo listo para probar! 🚀 