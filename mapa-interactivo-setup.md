# Sistema de Mapa Interactivo

Esta aplicación ahora incluye un sistema de mapa interactivo para las direcciones de los estudiantes, que permite tanto almacenar la dirección de texto como las coordenadas GPS precisas.

## Funcionalidades Implementadas

### 1. Formulario de Inscripción
- Campo de dirección con mapa interactivo
- Búsqueda automática de direcciones
- Selección manual en el mapa haciendo clic
- Arrastrar marcador para ajustar ubicación
- Almacenamiento de dirección de texto y coordenadas GPS

### 2. Modal de Edición de Estudiante
- Mapa interactivo para modificar la ubicación
- Conserva tanto la dirección original como las coordenadas
- Sincronización entre campo de texto y mapa

### 3. Vista Detallada del Estudiante
- Muestra mapa embebido con la ubicación del estudiante
- Información de coordenadas GPS si están disponibles
- Fallback a botón "Abrir en Google Maps" si no hay API key

## Configuración Requerida

### Variables de Entorno
```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyAkJA2y7VQLc7S_ioTeAmVzxnZaNfkoPcM
```

### Servicios de Google Maps Necesarios
1. **Maps Embed API** - Para mostrar mapas embebidos
2. **Maps JavaScript API** - Para mapa interactivo
3. **Geocoding API** - Para conversión dirección ↔ coordenadas

## Estructura de Base de Datos

### Nuevos Campos en `StudentEnrollmentData`
```sql
addressLatitude   FLOAT  -- Latitud GPS
addressLongitude  FLOAT  -- Longitud GPS
```

Estos campos complementan el campo `address` existente, permitiendo tener tanto la dirección legible como las coordenadas precisas.

## Componentes Nuevos

### `InteractiveMap.tsx`
Componente reutilizable que incluye:
- Campo de búsqueda de dirección
- Mapa interactivo de Google Maps
- Marcador arrastrable
- Geocodificación automática
- Manejo de eventos de clic y arrastre

## Funcionalidades del Mapa

### Búsqueda de Direcciones
- Escribir dirección y presionar Enter o hacer clic en buscar
- Geocodificación automática usando Google Geocoding API
- Centrado automático en la ubicación encontrada

### Interacción Manual
- Hacer clic en cualquier parte del mapa para colocar marcador
- Arrastrar marcador existente para ajustar ubicación
- Geocodificación inversa para obtener dirección del punto seleccionado

### Almacenamiento Dual
- **Dirección de texto**: Para lectura humana y búsquedas
- **Coordenadas GPS**: Para precisión y mapas embebidos

## Beneficios

1. **Precisión**: Las coordenadas GPS son más precisas que las direcciones de texto
2. **Flexibilidad**: Permite direcciones no estándar o ubicaciones sin dirección formal
3. **Visualización**: Mapas embebidos en vistas detalladas
4. **Usabilidad**: Interface intuitiva para seleccionar ubicaciones
5. **Compatibilidad**: Funciona tanto con API key como sin ella (modo fallback)

## Fallbacks Sin API Key

Si no se configura `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`:
- Se muestra solo el campo de texto para dirección
- En vista detallada: botón para abrir Google Maps
- No se almacenan coordenadas, solo dirección de texto

## Uso en el Código

### En Formularios
```tsx
<InteractiveMap
  address={formData.address}
  latitude={formData.addressLatitude}
  longitude={formData.addressLongitude}
  onAddressChange={(address) => updateFormData('address', address)}
  onCoordinatesChange={(lat, lng) => {
    updateFormData('addressLatitude', lat)
    updateFormData('addressLongitude', lng)
  }}
/>
```

### En APIs
```typescript
// Al crear/actualizar estudiante
{
  address: data.address || null,
  addressLatitude: data.addressLatitude || null,
  addressLongitude: data.addressLongitude || null,
  // ... otros campos
}
```

Esta implementación mejora significativamente la gestión de ubicaciones en la aplicación, proporcionando tanto precisión técnica como facilidad de uso. 