import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ⚡ CONFIGURACIÓN OPTIMIZADA DE PRISMA
// Prisma 7.0.0 lee DATABASE_URL automáticamente de process.env.DATABASE_URL
// No es necesario especificarlo en datasources
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })
}

// Solo crear la instancia si no existe globalmente
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// En desarrollo, mantener la instancia global para hot reload
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// ⚡ FUNCIÓN DE HEALTH CHECK PARA LA BD
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error("❌ Database health check failed:", error)
    return false
  }
}

// ⚡ FUNCIÓN PARA CERRAR CONEXIONES APROPIADAMENTE
export async function closePrisma(): Promise<void> {
  await prisma.$disconnect()
}

// 🇨🇴 CONFIGURACIÓN DE ZONA HORARIA COLOMBIANA
export function setColombianTimezone() {
  // Configurar la zona horaria de la sesión de PostgreSQL
  return prisma.$executeRaw`SET TIME ZONE 'America/Bogota'`
}

// Las funciones de zona horaria ya no son necesarias porque:
// - La base de datos está configurada con timezone 'America/Bogota'
// - Los timestamps se manejan automáticamente en la zona horaria correcta

// ⚡ CONFIGURAR CONNECTION POOLING A NIVEL DE DATABASE_URL
// Agrega estos parámetros a tu DATABASE_URL en .env:
// ?connection_limit=10&pool_timeout=20&connect_timeout=10&pgbouncer=true

/* 
EJEMPLO DE DATABASE_URL OPTIMIZADA:
postgresql://user:password@localhost:5432/database?connection_limit=10&pool_timeout=20&connect_timeout=10
*/
