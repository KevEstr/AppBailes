const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Función para generar imagen dinámica basada en el nombre del producto
function generateProductImage(productName) {
  const baseUrl = 'https://ui-avatars.com/api/';
  const params = new URLSearchParams({
    name: productName,
    size: '200',
    background: 'random',
    color: 'fff',
    bold: true,
    format: 'png'
  });
  
  return `${baseUrl}?${params.toString()}`;
}

// Función para determinar la categoría basada en el nombre del producto
function getProductCategory(productName) {
  const name = productName.toLowerCase();
  
  // Adiciones (prioridad alta - antes que jugos)
  if (name.includes('adiciones')) {
    return 'ADDITIONS';
  }
  
  // Jugos naturales (solo jugos puros, no micheladas)
  if ((name.includes('mora') || name.includes('lulo') || name.includes('borojo') || 
       name.includes('mango') || name.includes('guanabana') || name.includes('uva') || 
       name.includes('fresa') || name.includes('maracuya') || name.includes('tomate de arbol') || 
       name.includes('mandarina') || name.includes('piña') || name.includes('guayaba') || 
       name.includes('coco') || name.includes('banano') || name.includes('naranja') || 
       name.includes('limon') || name.includes('sandia') || name.includes('cereza')) &&
      !name.includes('michelada') && !name.includes('limonada')) {
    return 'JUICES';
  }
  
  // Limonadas
  if (name.includes('limonada')) {
    return 'BEVERAGES';
  }
  
  // Micheladas
  if (name.includes('michelada')) {
    return 'BEVERAGES';
  }
  
  // Bebidas alcohólicas
  if (name.includes('pilsen') || name.includes('aguila') || name.includes('aguardiente')) {
    return 'BEVERAGES';
  }
  
  // Bebidas deportivas y agua
  if (name.includes('gatorade') || name.includes('agua') || name.includes('milo')) {
    return 'BEVERAGES';
  }
  
  // Comida
  if (name.includes('torta') || name.includes('pastel') || name.includes('proteina')) {
    return 'FOOD';
  }
  
  // Snacks
  if (name.includes('rollo')) {
    return 'SNACKS';
  }
  
  // Uniformes y ropa
  if (name.includes('uniforme') || name.includes('camisilla') || name.includes('sudadera') || 
      name.includes('chaqueta') || name.includes('conjunto') || name.includes('mangas')) {
    return 'UNIFORMS';
  }
  
  // Accesorios deportivos
  if (name.includes('rodillera') || name.includes('balones')) {
    return 'ACCESSORIES';
  }
  
  // Vasos y pitillos van a OTHER
  if (name.includes('vasos') || name.includes('pitillos')) {
    return 'OTHER';
  }
  
  // Por defecto
  return 'OTHER';
}

// Función para generar descripción basada en el nombre del producto
function generateDescription(productName) {
  const name = productName.toLowerCase();
  
  if (name.includes('mora') || name.includes('lulo') || name.includes('borojo') || 
      name.includes('mango') || name.includes('guanabana') || name.includes('uva') || 
      name.includes('fresa') || name.includes('maracuya') || name.includes('tomate de arbol') || 
      name.includes('mandarina') || name.includes('piña') || name.includes('guayaba') || 
      name.includes('coco') || name.includes('banano') || name.includes('naranja') || 
      name.includes('limon') || name.includes('sandia') || name.includes('cereza')) {
    return `Jugo natural de ${productName.toLowerCase()}, preparado con frutas frescas y naturales.`;
  }
  
  if (name.includes('limonada')) {
    return `Limonada refrescante de ${productName.toLowerCase().replace('limonada de ', '')}, perfecta para hidratarse.`;
  }
  
  if (name.includes('michelada')) {
    return `Michelada ${productName.toLowerCase().replace('michelada ', '')}, bebida refrescante con cerveza y limón.`;
  }
  
  if (name.includes('uniforme')) {
    return `Uniforme deportivo ${productName.toLowerCase().replace('uniforme ', '')}, cómodo y funcional para entrenamientos.`;
  }
  
  if (name.includes('rodillera')) {
    return `Rodillera ${productName.toLowerCase().replace('rodillera ', '')}, protección y comodidad para tus rodillas.`;
  }
  
  if (name.includes('adiciones')) {
    return `Adición de ${productName.toLowerCase().replace('adiciones de ', '')}, complemento para tus bebidas.`;
  }
  
  if (name.includes('vasos')) {
    return `Vasos ${productName.toLowerCase().replace('vasos para ', '')}, ideales para servir tus bebidas favoritas.`;
  }
  
  if (name.includes('pitillos')) {
    return 'Pitillos reutilizables, perfectos para tus bebidas.';
  }
  
  if (name.includes('balones')) {
    return 'Balones deportivos de alta calidad para entrenamiento y competición.';
  }
  
  if (name.includes('milo')) {
    return 'Bebida energética Milo, rica en vitaminas y minerales.';
  }
  
  if (name.includes('gatorade')) {
    return 'Bebida deportiva Gatorade, ideal para recuperar electrolitos.';
  }
  
  if (name.includes('agua')) {
    return 'Agua purificada, esencial para mantenerte hidratado.';
  }
  
  if (name.includes('pilsen') || name.includes('aguila')) {
    return `Cerveza ${productName}, bebida refrescante para adultos.`;
  }
  
  if (name.includes('aguardiente')) {
    return 'Aguardiente colombiano, bebida tradicional del país.';
  }
  
  if (name.includes('torta') || name.includes('pastel')) {
    return `Dulce ${productName.toLowerCase()}, perfecto para acompañar tus bebidas.`;
  }
  
  if (name.includes('proteina')) {
    return 'Suplemento de proteína, ideal para complementar tu entrenamiento.';
  }
  
  if (name.includes('rollo')) {
    return 'Rollo de papel higiénico, artículo de primera necesidad.';
  }
  
  return `Producto ${productName.toLowerCase()}, de alta calidad y buen precio.`;
}

// Datos del CSV
// Cargamos directamente desde productos_csv.csv para conservar los precios exactos
function loadProductsFromCsv() {
  const csvPath = path.resolve(__dirname, '..', 'productos_csv.csv');
  const raw = fs.readFileSync(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  return lines.map((line) => {
    const [rawName, rawPrice] = line.split(',');
    const name = (rawName || '').trim().replace(/\s+/g, ' ');
    // En el CSV los precios vienen con puntos como separador de miles (ej: 6.000)
    // Para double precision en DB, quitamos los puntos y parseamos a número
    const price = parseFloat(((rawPrice || '').trim()).replace(/\./g, ''));
    return { name, price };
  });
}

const productsData = loadProductsFromCsv();
/*
const productsData = [
  { name: 'Mora', price: 6.000 },
  { name: 'Lulo', price: 6.000 },
  { name: 'Borojo', price: 6.000 },
  { name: 'Mango', price: 6.000 },
  { name: 'Guanabana', price: 6.000 },
  { name: 'Uva', price: 6.000 },
  { name: 'Fresa', price: 6.000 },
  { name: 'Maracuya', price: 6.000 },
  { name: 'Tomate de arbol', price: 6.000 },
  { name: 'Mandarina', price: 6.000 },
  { name: 'Piña', price: 6.000 },
  { name: 'Guayaba', price: 6.000 },
  { name: 'Coco', price: 6.000 },
  { name: 'Banano', price: 6.000 },
  { name: 'Naranja - Piña', price: 7.000 },
  { name: 'Mandarina - Fresa', price: 7.000 },
  { name: 'Mandarina - Lulo', price: 7.000 },
  { name: 'Fresa - Mora', price: 7.000 },
  { name: 'Uva - Fresa', price: 7.000 },
  { name: 'Maracuya - Mango', price: 7.000 },
  { name: 'Lulo - Maracuya', price: 7.000 },
  { name: 'Fresa - Mango', price: 7.000 },
  { name: 'Mora - Uva', price: 7.000 },
  { name: 'Piña - Mandarina', price: 7.000 },
  { name: 'Mango - Piña', price: 7.000 },
  { name: 'Fresa - Piña', price: 7.000 },
  { name: 'Uva - Fresa - Mora', price: 8.000 },
  { name: 'Limon - Fresa - Sandia', price: 8.000 },
  { name: 'Lulo - Maracuya - Piña', price: 8.000 },
  { name: 'Mango - Piña - Fresa', price: 8.000 },
  { name: 'Mora en leche', price: 7.000 },
  { name: 'Lulo en leche', price: 7.000 },
  { name: 'Borojo en leche', price: 7.000 },
  { name: 'Mango en leche', price: 7.000 },
  { name: 'Guanabana en leche', price: 7.000 },
  { name: 'Uva en leche', price: 7.000 },
  { name: 'Fresa en leche', price: 7.000 },
  { name: 'Maracuya en leche', price: 7.000 },
  { name: 'Tomate de arbol en leche', price: 7.000 },
  { name: 'Mandarina en leche', price: 7.000 },
  { name: 'Piña en leche', price: 7.000 },
  { name: 'Guayaba en leche', price: 7.000 },
  { name: 'Coco en leche', price: 7.000 },
  { name: 'Banano en leche', price: 7.000 },
  { name: 'Naranja - Piña en leche', price: 8.000 },
  { name: 'Mandarina - Fresa en leche', price: 8.000 },
  { name: 'Mandarina - Lulo en leche', price: 8.000 },
  { name: 'Fresa - Mora en leche', price: 8.000 },
  { name: 'Uva - Fresa en leche', price: 8.000 },
  { name: 'Maracuya - Mango en leche', price: 8.000 },
  { name: 'Lulo - Maracuya en leche', price: 8.000 },
  { name: 'Fresa - Mango en leche', price: 8.000 },
  { name: 'Mora - Uva en leche', price: 8.000 },
  { name: 'Piña - Mandarina en leche', price: 8.000 },
  { name: 'Mango - Piña en leche', price: 8.000 },
  { name: 'Fresa - Piña en leche', price: 8.000 },
  { name: 'Uva - Fresa - Mora en leche', price: 9.000 },
  { name: 'Limon - Fresa - Sandia en leche', price: 9.000 },
  { name: 'Lulo - Maracuya - Piña en leche', price: 9.000 },
  { name: 'Mango - Piña - Fresa en leche', price: 9.000 },
  { name: 'Milo', price: 7.000 },
  { name: 'Milo - Fresa', price: 8.000 },
  { name: 'Milo - Banano', price: 8.000 },
  { name: 'Milo - Borojo', price: 8.000 },
  { name: 'Milo - Guanabana', price: 8.000 },
  { name: 'Limonada natural', price: 6.000 },
  { name: 'Limonada de lulo', price: 7.000 },
  { name: 'Limonada de fresa', price: 7.000 },
  { name: 'Limonada de maracuya', price: 7.000 },
  { name: 'Limonada de cereza', price: 7.000 },
  { name: 'Limonada de mango', price: 7.000 },
  { name: 'Limonada de mandarina', price: 7.000 },
  { name: 'Limonada de coco', price: 7.000 },
  { name: 'Soda michelada', price: 6.000 },
  { name: 'Michelada Manzana Verde', price: 8.000 },
  { name: 'Michelada Mango Biche', price: 8.000 },
  { name: 'Michelada Sandia', price: 8.000 },
  { name: 'Michelada Maracuya', price: 8.000 },
  { name: 'Michelada Frutos Rojos', price: 8.000 },
  { name: 'Michelada Cereza', price: 8.000 },
  { name: 'Michelada Pilsen', price: 7.000 },
  { name: 'Michelada Pilsen Frutal', price: 9.000 },
  { name: 'Michelada Aguila Light', price: 7.000 },
  { name: 'Michelada Aguila Light Frutal', price: 9.000 },
  { name: 'Adiciones de pulpa', price: 2.000 },
  { name: 'Adiciones de Mero Macho', price: 2.000 },
  { name: 'Adiciones de Kola Granulada', price: 3.000 },
  { name: 'Adiciones de Ginseng', price: 2.000 },
  { name: 'Adiciones de Arrechon', price: 2.000 },
  { name: 'Adiciones de 180', price: 2.000 },
  { name: 'Adiciones de Vitacerebrina', price: 2.000 },
  { name: 'Adiciones de Rinho', price: 2.000 },
  { name: 'Adiciones de Proteina', price: 4.000 },
  { name: 'Adiciones de Leche', price: 2.000 },
  { name: 'Adiciones de Limon', price: 1.000 },
  { name: 'Adiciones de Bretaña', price: 4.000 },
  { name: 'Vasos para micheladas', price: 1.000 },
  { name: 'Vasos para jugos', price: 1.000 },
  { name: 'Pitillos', price: 1.000 },
  { name: 'Pilsen', price: 4.000 },
  { name: 'Aguila Light', price: 4.000 },
  { name: 'Adiciones de Mora', price: 2.000 },
  { name: 'Adiciones de Lulo', price: 2.000 },
  { name: 'Adiciones de Borojo', price: 2.000 },
  { name: 'Adiciones de Mango', price: 2.000 },
  { name: 'Adiciones de Guanabana', price: 2.000 },
  { name: 'Adiciones de Uva', price: 2.000 },
  { name: 'Adiciones de Fresa', price: 2.000 },
  { name: 'Adiciones de Maracuya', price: 2.000 },
  { name: 'Adiciones de Tomate de Arbol', price: 2.000 },
  { name: 'Adiciones de Mandarina', price: 2.000 },
  { name: 'Adiciones de Piña', price: 2.000 },
  { name: 'Adiciones de Guayaba', price: 2.000 },
  { name: 'Adiciones de Coco', price: 2.000 },
  { name: 'Adiciones de Banano', price: 2.000 },
  { name: 'Adiciones de Vitafer', price: 2.000 },
  { name: 'Milo - Coco', price: 8.000 },
  { name: 'Gatorade', price: 4.000 },
  { name: 'Agua', price: 2.000 },
  { name: 'Aguila Ligth Litro', price: 8.000 },
  { name: 'Milo - Cereza', price: 8.000 },
  { name: 'Rollo', price: 2.000 },
  { name: 'Pilsen Litro', price: 8.000 },
  { name: 'Torta', price: 2.000 },
  { name: 'Pastel', price: 2.000 },
  { name: 'Proteina', price: 6.000 },
  { name: 'Limonada de coco en leche', price: 8.000 },
  { name: 'Banano - Coco', price: 7.000 },
  { name: 'Banano - Coco en leche', price: 8.000 },
  { name: 'Caja Aguardiente Azul', price: 70.000 },
  { name: 'Maracuya - Mango - Lulo', price: 8.000 },
  { name: 'Maracuya - Mango - Lulo en leche', price: 9.000 },
  { name: 'Uniforme Camisilla', price: 50.000 },
  { name: 'Uniforme Sudadera', price: 75.000 },
  { name: 'Uniforme Chaqueta', price: 80.000 },
  { name: 'Uniforme Conjunto Femenino', price: 190.000 },
  { name: 'Uniforme Hombre', price: 70.000 },
  { name: 'Rodillera Espuma', price: 55.000 },
  { name: 'Rodillera Gel', price: 65.000 },
  { name: 'Mangas', price: 35.000 },
  { name: 'Uniforme Entrenamiento', price: 30.000 },
  { name: 'Uniforme Baile', price: 60.000 },
  { name: 'Balones', price: 180.000 },
  { name: 'Vaso michelado', price: 2.000 }
];
*/

async function seedProducts() {
  try {
    console.log('🌱 Iniciando la carga de productos...');
    
    // Primero, verificar si ya existen productos
    const existingProducts = await prisma.product.count();
    if (existingProducts > 0) {
      console.log(`⚠️  Ya existen ${existingProducts} productos en la base de datos.`);
      console.log('¿Deseas continuar y añadir más productos? (s/n)');
      // En un script real, podrías añadir lógica para confirmar
      return;
    }
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const productData of productsData) {
      try {
        // Verificar si el producto ya existe
        const existingProduct = await prisma.product.findFirst({
          where: { name: productData.name }
        });
        
        if (existingProduct) {
          console.log(`⏭️  Producto "${productData.name}" ya existe, saltando...`);
          skippedCount++;
          continue;
        }
        
        // Determinar categoría
        const category = getProductCategory(productData.name);
        
        // Generar descripción
        const description = generateDescription(productData.name);
        
        // Generar imagen
        const imageUrl = generateProductImage(productData.name);
        
        // Crear producto
        const product = await prisma.product.create({
          data: {
            name: productData.name,
            description: description,
            price: productData.price, // Precio ya normalizado desde CSV (double precision compatible)
            stock: 100, // Stock inicial de 100 unidades
            imageUrl: imageUrl,
            category: category,
            isActive: true
          }
        });
        
        console.log(`✅ Producto creado: ${product.name} - $${product.price} - ${category}`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creando producto "${productData.name}":`, error.message);
      }
    }
    
    console.log('\n🎉 Proceso completado!');
    console.log(`📊 Resumen:`);
    console.log(`   - Productos creados: ${createdCount}`);
    console.log(`   - Productos saltados: ${skippedCount}`);
    console.log(`   - Total procesados: ${productsData.length}`);
    
  } catch (error) {
    console.error('❌ Error en el proceso de carga:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
if (require.main === module) {
  seedProducts();
}

module.exports = { seedProducts };
