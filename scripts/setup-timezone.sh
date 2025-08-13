#!/bin/bash

# Script para configurar zona horaria de Colombia en PostgreSQL
# Ejecutar este script después de crear la base de datos

echo "Configurando zona horaria de Colombia..."

# Verificar si psql está disponible
if ! command -v psql &> /dev/null; then
    echo "Error: psql no está instalado o no está en el PATH"
    exit 1
fi

# Leer variables de entorno
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Verificar que DATABASE_URL esté definida
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL no está definida en las variables de entorno"
    exit 1
fi

echo "Ejecutando script de configuración de zona horaria..."

# Ejecutar el script SQL simplificado
psql "$DATABASE_URL" -f scripts/setup-timezone-simple.sql

if [ $? -eq 0 ]; then
    echo "✅ Configuración de zona horaria completada exitosamente"
else
    echo "❌ Error al configurar la zona horaria"
    exit 1
fi

echo "Actualizando vista financiera con zona horaria..."

# Ejecutar el script de la vista
psql "$DATABASE_URL" -f scripts/financial-transactions-view.sql

if [ $? -eq 0 ]; then
    echo "✅ Vista financiera actualizada exitosamente"
else
    echo "❌ Error al actualizar la vista financiera"
    exit 1
fi

echo "🎉 Configuración completada. La aplicación ahora maneja correctamente la zona horaria de Colombia." 