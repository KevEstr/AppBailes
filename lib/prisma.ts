import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// ⚡ CONFIGURACIÓN OPTIMIZADA DE PRISMA
function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
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

// ⚡ CONFIGURAR CONNECTION POOLING A NIVEL DE DATABASE_URL
// Agrega estos parámetros a tu DATABASE_URL en .env:
// ?connection_limit=10&pool_timeout=20&connect_timeout=10&pgbouncer=true

/* 
EJEMPLO DE DATABASE_URL OPTIMIZADA:
postgresql://user:password@localhost:5432/database?connection_limit=10&pool_timeout=20&connect_timeout=10
*/
