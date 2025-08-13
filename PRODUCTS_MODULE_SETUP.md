# Módulo de Administración de Productos

## 📋 Descripción

Este módulo permite gestionar el inventario de productos y snacks de la academia, incluyendo jugos naturales, snacks saludables y otros productos. Sigue el mismo patrón arquitectónico que los otros módulos del sistema.

## 🚀 Instalación y Configuración

### 1. Ejecutar Script de Configuración Automática

```bash
node scripts/setup-products.js
```

Este script ejecutará automáticamente:
- Migración de la base de datos
- Generación del cliente Prisma
- Seeder con 10 productos de ejemplo

### 2. Configuración Manual (si es necesario)

#### Aplicar Migración
```bash
npx prisma migrate dev --name add_products_module
```

#### Generar Cliente Prisma
```bash
npx prisma generate
```

#### Ejecutar Seeder
```bash
npx tsx scripts/seed-products.ts
```

## 🗄️ Estructura de la Base de Datos

### Tabla `products`
```sql
- id: Int (PK, autoincrement)
- name: String (nombre del producto)
- description: String? (descripción opcional)
- price: Float (precio en pesos colombianos)
- stock: Int (cantidad en inventario)
- imageUrl: String? (URL de la imagen)
- category: ProductCategory (enum)
- isActive: Boolean (estado activo/inactivo)
- createdAt: DateTime
- updatedAt: DateTime
```

### Tabla `product_sales` (para futuras funcionalidades)
```sql
- id: Int (PK, autoincrement)
- productId: Int (FK a products)
- quantity: Int (cantidad vendida)
- unitPrice: Float (precio unitario)
- totalAmount: Float (monto total)
- soldAt: DateTime (fecha de venta)
- notes: String? (notas adicionales)
- createdAt: DateTime
- updatedAt: DateTime
```

### Enums
```typescript
enum ProductCategory {
  JUICES      // Jugos naturales
  SNACKS      // Snacks
  BEVERAGES   // Bebidas
  FOOD        // Comida
  OTHER       // Otros
}
```

## 🔌 API Endpoints

### GET `/api/admin/products`
Obtiene productos con paginación y filtros.

**Parámetros de consulta:**
- `page`: Página actual (default: 1)
- `limit`: Elementos por página (default: 10)
- `search`: Búsqueda por nombre o descripción
- `category`: Filtro por categoría
- `active`: Filtro por estado activo (true/false)

**Respuesta:**
```json
{
  "success": true,
  "products": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 25,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### POST `/api/admin/products`
Crea un nuevo producto.

**Body:**
```json
{
  "name": "Jugo de Naranja Natural",
  "description": "Jugo fresco de naranja recién exprimida",
  "price": 3500,
  "stock": 25,
  "category": "JUICES",
  "imageUrl": "https://ejemplo.com/imagen.jpg",
  "isActive": true
}
```

### GET `/api/admin/products/[id]`
Obtiene un producto específico por ID.

### PUT `/api/admin/products/[id]`
Actualiza un producto existente.

### DELETE `/api/admin/products/[id]`
Elimina un producto.

### GET `/api/admin/products/stats`
Obtiene estadísticas de productos.

**Respuesta:**
```json
{
  "success": true,
  "stats": {
    "totalProducts": 10,
    "activeProducts": 8,
    "inactiveProducts": 2,
    "lowStockProducts": 3,
    "outOfStockProducts": 1,
    "totalStockValue": 125000,
    "categoryBreakdown": [...]
  }
}
```

## 🎨 Componentes de UI

### `ProductModal`
Modal reutilizable para crear y editar productos.

**Props:**
- `isOpen`: Boolean
- `product`: Product | null
- `isLoading`: Boolean
- `onSave`: (product: Product) => void
- `onClose`: () => void

### `ProductsManagementPage`
Página principal de administración de productos.

**Características:**
- Listado de productos con paginación
- Filtros por categoría y estado
- Búsqueda en tiempo real
- Estadísticas en tiempo real
- Modal para crear/editar productos
- Confirmación de eliminación

## 📊 Productos de Ejemplo

El seeder incluye 10 productos:

### Jugos Naturales (5 productos)
1. **Jugo de Naranja Natural** - $3,500
2. **Jugo de Limonada Natural** - $3,000
3. **Jugo de Mora Silvestre** - $4,000
4. **Jugo de Piña y Jengibre** - $3,800
5. **Jugo de Zanahoria y Naranja** - $3,200

### Snacks (5 productos)
1. **Chips de Plátano** - $2,500
2. **Mix de Frutos Secos** - $4,500
3. **Barras de Granola Casera** - $2,800
4. **Palomitas de Maíz Naturales** - $1,800
5. **Galletas de Avena y Miel** - $2,200

## 🎯 Funcionalidades Implementadas

### ✅ Completadas
- [x] CRUD completo de productos
- [x] Paginación en backend
- [x] Búsqueda por nombre y descripción
- [x] Filtros por categoría y estado
- [x] Estadísticas en tiempo real
- [x] Modal para crear/editar productos
- [x] Validación de formularios
- [x] Confirmación de eliminación
- [x] Diseño responsive
- [x] Integración con el menú de admin
- [x] Seeder con productos de ejemplo

### 🔮 Futuras Funcionalidades
- [ ] Sistema de ventas de productos
- [ ] Control de inventario automático
- [ ] Alertas de stock bajo
- [ ] Reportes de ventas
- [ ] Códigos de barras/QR
- [ ] Múltiples imágenes por producto
- [ ] Variantes de productos (tamaños, sabores)
- [ ] Integración con proveedores

## 🛠️ Tecnologías Utilizadas

- **Backend**: Next.js API Routes, Prisma ORM
- **Frontend**: React, TypeScript, Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **Base de Datos**: PostgreSQL
- **Validación**: Validación manual en frontend y backend

## 📁 Estructura de Archivos

```
app/
├── admin/
│   └── products/
│       └── page.tsx                 # Página principal
├── api/
│   └── admin/
│       └── products/
│           ├── route.ts             # CRUD principal
│           ├── [id]/
│           │   └── route.ts         # Operaciones individuales
│           └── stats/
│               └── route.ts         # Estadísticas

components/
└── admin/
    └── ProductModal.tsx             # Modal de productos

scripts/
├── seed-products.ts                 # Seeder de productos
└── setup-products.js                # Script de configuración

prisma/
└── schema.prisma                    # Esquema de BD (actualizado)
```

## 🔐 Seguridad

- Todos los endpoints requieren autenticación de administrador
- Validación de datos en frontend y backend
- Sanitización de inputs
- Control de acceso basado en roles

## 🎨 Diseño

El módulo sigue el mismo patrón de diseño que el resto de la aplicación:
- Gradientes morados y rosas
- Cards con efectos hover
- Iconos de Lucide
- Diseño responsive
- Modo oscuro compatible

## 🚀 Acceso

Una vez configurado, accede al módulo en:
```
http://localhost:3000/admin/products
```

O desde el menú de administración en:
```
http://localhost:3000/admin
```
