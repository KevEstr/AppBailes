import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const products = [
  // Jugos Naturales
  {
    name: "Jugo de Naranja Natural",
    description: "Jugo fresco de naranja recién exprimida, rico en vitamina C",
    price: 3500,
    stock: 25,
    category: "JUICES",
    imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop",
    isActive: true
  },
  {
    name: "Jugo de Limonada Natural",
    description: "Limonada fresca con limones orgánicos y un toque de menta",
    price: 3000,
    stock: 20,
    category: "JUICES",
    imageUrl: "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=400&fit=crop",
    isActive: true
  },
  {
    name: "Jugo de Mora Silvestre",
    description: "Jugo natural de mora silvestre, antioxidante y delicioso",
    price: 4000,
    stock: 15,
    category: "JUICES",
    imageUrl: "https://images.unsplash.com/photo-1546173159-315724a31696?w=400&h=400&fit=crop",
    isActive: true
  },
  {
    name: "Jugo de Piña y Jengibre",
    description: "Combinación refrescante de piña natural con jengibre fresco",
    price: 3800,
    stock: 18,
    category: "JUICES",
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop",
    isActive: true
  },
  {
    name: "Jugo de Zanahoria y Naranja",
    description: "Jugo saludable de zanahoria y naranja, rico en betacaroteno",
    price: 3200,
    stock: 22,
    category: "JUICES",
    imageUrl: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=400&fit=crop",
    isActive: true
  },
  
  // Snacks
  {
    name: "Chips de Plátano",
    description: "Chips crujientes de plátano maduro, horneados sin aceite",
    price: 2500,
    stock: 30,
    category: "SNACKS",
    imageUrl: "https://images.unsplash.com/photo-1603046891744-76e6300df9e9?w=400&h=400&fit=crop",
    isActive: true
  },
  {
    name: "Mix de Frutos Secos",
    description: "Mezcla de almendras, nueces, pasas y semillas de girasol",
    price: 4500,
    stock: 20,
    category: "SNACKS",
    imageUrl: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400&h=400&fit=crop",
    isActive: true
  },
  {
    name: "Barras de Granola Casera",
    description: "Barras energéticas de granola con miel y frutos secos",
    price: 2800,
    stock: 25,
    category: "SNACKS",
    imageUrl: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=400&fit=crop",
    isActive: true
  },
  {
    name: "Palomitas de Maíz Naturales",
    description: "Palomitas de maíz orgánico, sin sal añadida",
    price: 1800,
    stock: 35,
    category: "SNACKS",
    imageUrl: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop",
    isActive: true
  },
  {
    name: "Galletas de Avena y Miel",
    description: "Galletas caseras de avena con miel natural, sin azúcar refinada",
    price: 2200,
    stock: 28,
    category: "SNACKS",
    imageUrl: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop",
    isActive: true
  }
]

async function seedProducts() {
  try {
    console.log('🌱 Iniciando siembra de productos...')

    // Limpiar productos existentes (opcional)
    await prisma.product.deleteMany({})
    console.log('🗑️ Productos existentes eliminados')

    // Crear productos
    for (const product of products) {
      await prisma.product.create({
        data: product
      })
      console.log(`✅ Producto creado: ${product.name}`)
    }

    console.log('🎉 Siembra de productos completada exitosamente!')
    console.log(`📊 Total de productos creados: ${products.length}`)
    
    // Mostrar estadísticas
    const totalProducts = await prisma.product.count()
    const activeProducts = await prisma.product.count({ where: { isActive: true } })
    const totalStockValue = await prisma.product.aggregate({
      where: { isActive: true },
      _sum: { stock: true }
    })

    console.log('\n📈 Estadísticas:')
    console.log(`- Total de productos: ${totalProducts}`)
    console.log(`- Productos activos: ${activeProducts}`)
    console.log(`- Stock total: ${totalStockValue._sum.stock || 0} unidades`)

  } catch (error) {
    console.error('❌ Error durante la siembra:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar el seeder
seedProducts()
