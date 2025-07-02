#!/bin/sh

# Script de inicio para producción en Railway
set -e

echo "🚀 Iniciando AppBailes en producción..."

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL no está configurada"
  exit 1
fi

echo "✅ DATABASE_URL configurada correctamente"

# Generar Prisma Client
echo "📦 Generando Prisma Client..."
npx prisma generate

# Verificar conexión a la base de datos con retry
echo "🔍 Verificando conexión a la base de datos..."
for i in {1..10}; do
  if npx prisma db push --accept-data-loss --skip-generate >/dev/null 2>&1; then
    echo "✅ Conexión a la base de datos exitosa"
    break
  else
    echo "⏳ Intento $i/10: Esperando conexión a la base de datos..."
    sleep 5
  fi
  
  if [ $i -eq 10 ]; then
    echo "❌ No se pudo conectar a la base de datos después de 10 intentos"
    exit 1
  fi
done

# Ejecutar migraciones de la base de datos
echo "🗄️ Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

# Opcional: Ejecutar seed solo si es el primer deployment
# Para habilitarlo, descomenta las siguientes líneas:
# echo "🌱 Ejecutando seed de la base de datos..."
# npx prisma db seed || echo "⚠️ Seed falló o ya se ejecutó previamente"

echo "✅ Base de datos configurada correctamente"

# Iniciar la aplicación
echo "🌟 Iniciando servidor Next.js..."
exec node server.js 