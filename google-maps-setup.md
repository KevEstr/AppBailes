# Configuración de Google Maps

Para habilitar la funcionalidad del mapa en los detalles del estudiante, sigue estos pasos:

## 1. Obtener API Key de Google Maps

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API "Maps Embed API"
4. Ve a "Credenciales" y crea una nueva API Key
5. Restringe la API Key para mayor seguridad (opcional pero recomendado)

## 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

## 3. Reiniciar el Servidor

Después de agregar la variable de entorno:

```bash
npm run dev
```

## Nota

Si no configuras la API key, la aplicación seguirá funcionando normalmente. En lugar del mapa embebido, se mostrará un botón para abrir Google Maps en una nueva pestaña. 