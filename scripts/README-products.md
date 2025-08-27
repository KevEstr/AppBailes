# Scripts de Carga de Productos

Este directorio contiene scripts para cargar automáticamente todos los productos del CSV a la base de datos.

## 📋 Productos Incluidos

El script incluye **144 productos** organizados en las siguientes categorías:

### 🥤 Jugos Naturales (JUICES)
- Jugos de frutas individuales: Mora, Lulo, Borojo, Mango, Guanabana, Uva, Fresa, Maracuya, etc.
- Combinaciones de jugos: Naranja - Piña, Mandarina - Fresa, etc.
- Jugos en leche: Mora en leche, Lulo en leche, etc.

### 🥤 Bebidas (BEVERAGES)
- Limonadas: Natural, de lulo, de fresa, de maracuya, etc.
- Micheladas: Manzana Verde, Mango Biche, Sandia, etc.
- Bebidas alcohólicas: Pilsen, Aguila Light, Aguardiente
- Bebidas deportivas: Gatorade, Milo
- Agua

### 🍰 Comida (FOOD)
- Dulces: Torta, Pastel
- Suplementos: Proteina

### 🍿 Snacks (SNACKS)
- Rollo de papel higiénico

### 👕 Uniformes (UNIFORMS)
- Uniforme Camisilla, Sudadera, Chaqueta
- Uniforme Conjunto Femenino, Hombre
- Uniforme Entrenamiento, Baile
- Mangas

### 🏐 Accesorios (ACCESSORIES)
- Rodilleras: Espuma, Gel
- Balones deportivos

### ➕ Adiciones (ADDITIONS)
- Adiciones de pulpa, Mero Macho, Kola Granulada
- Adiciones de Ginseng, Arrechon, 180
- Adiciones de Vitacerebrina, Rinho, Proteina
- Adiciones de Leche, Limon, Bretaña
- Adiciones de frutas: Mora, Lulo, Borojo, Mango, etc.

### 🥤 Otros (OTHER)
- Vasos para micheladas y jugos
- Pitillos

## 🚀 Cómo Ejecutar

### Opción 1: Script Completo (Recomendado)
```bash
node scripts/run-product-seed.js
```
Este script:
1. Aplica la migración de Prisma automáticamente
2. Genera el cliente de Prisma
3. Ejecuta la carga de productos

### Opción 2: Script Simple
Si ya tienes las migraciones aplicadas:
```bash
node scripts/seed-products-simple.js
```

### Opción 3: Script Manual
Si prefieres controlar cada paso:
```bash
# 1. Aplicar migración (si es necesario)
npx prisma migrate dev --name add_product_categories

# 2. Generar cliente de Prisma
npx prisma generate

# 3. Ejecutar carga de productos
node scripts/seed-products.js
```

## 📊 Características del Script

### ✅ Funcionalidades
- **Detección automática de categorías** basada en el nombre del producto
- **Generación de descripciones** personalizadas para cada producto
- **Imágenes dinámicas** generadas usando UI Avatars API
- **Stock inicial** de 100 unidades para todos los productos
- **Verificación de duplicados** para evitar productos repetidos
- **Logs detallados** del proceso de carga

### 🎨 Imágenes Generadas
Las imágenes se generan dinámicamente usando el servicio UI Avatars:
- Fondo aleatorio
- Texto en blanco y negrita
- Tamaño 200x200px
- Formato PNG

### 📝 Descripciones Generadas
Cada producto recibe una descripción contextual basada en su tipo:
- Jugos: "Jugo natural de [fruta], preparado con frutas frescas y naturales"
- Limonadas: "Limonada refrescante de [sabor], perfecta para hidratarse"
- Uniformes: "Uniforme deportivo [tipo], cómodo y funcional para entrenamientos"
- Y muchas más...

## 🔧 Configuración

### Categorías Añadidas
Se añadieron tres nuevas categorías al enum `ProductCategory`:
- `UNIFORMS` - Para uniformes deportivos
- `ACCESSORIES` - Para accesorios deportivos
- `ADDITIONS` - Para adiciones y complementos de bebidas

### Precios
Los precios se convierten automáticamente a pesos colombianos quitando el punto decimal (ej: 6.000 → $6000).

## 📈 Resultado Esperado

Al ejecutar el script exitosamente, verás:
```
🌱 Iniciando la carga de productos...
✅ Producto creado: Mora - $6000 - JUICES
✅ Producto creado: Lulo - $6000 - JUICES
✅ Producto creado: Adiciones de pulpa - $2000 - ADDITIONS
...
🎉 Proceso completado!
📊 Resumen:
   - Productos creados: 144
   - Productos saltados: 0
   - Total procesados: 144
```

## ⚠️ Notas Importantes

1. **Migración requerida**: El script añade nuevas categorías al enum, por lo que se necesita aplicar una migración de Prisma.

2. **Verificación de duplicados**: Si ya existen productos con los mismos nombres, el script los saltará automáticamente.

3. **Conexión a la base de datos**: Asegúrate de que tu base de datos esté configurada y accesible.

4. **Variables de entorno**: Verifica que tu archivo `.env` tenga la variable `DATABASE_URL` configurada correctamente.

## 🐛 Solución de Problemas

### Error: "Unknown enum value"
Si ves este error, significa que las nuevas categorías no están en la base de datos:
```bash
# Aplica la migración manualmente
npx prisma migrate dev --name add_product_categories
```

### Error: "Cannot connect to database"
Verifica tu configuración de base de datos en el archivo `.env`.

### Error: "Product already exists"
Esto es normal si ya ejecutaste el script antes. Los productos duplicados se saltan automáticamente.

## 📞 Soporte

Si encuentras algún problema, revisa:
1. Los logs de la consola para errores específicos
2. La configuración de tu base de datos
3. Que todas las dependencias estén instaladas (`@prisma/client`)
