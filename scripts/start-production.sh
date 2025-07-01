#!/bin/bash

# Script de inicio para producción en Railway
set -e

echo "🚀 Iniciando AppBailes en producción..."

# Generar Prisma Client
echo "📦 Generando Prisma Client..."
npx prisma generate

# Ejecutar migraciones de la base de datos
echo "🗄️ Ejecutando migraciones de base de datos..."
npx prisma migrate deploy

# Verificar conexión a la base de datos
echo "🔍 Verificando conexión a la base de datos..."
npx prisma db pull --force

# Opcional: Ejecutar seed solo si es el primer deployment
# Comentar estas líneas si no quieres ejecutar seed en cada deployment
# echo "🌱 Ejecutando seed de la base de datos..."
# npx prisma db seed

echo "✅ Base de datos configurada correctamente"

# Iniciar la aplicación
echo "🌟 Iniciando servidor Next.js..."
exec node server.js 