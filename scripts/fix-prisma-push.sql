-- Script para permitir que prisma db push funcione
-- Eliminar la vista que causa conflicto

DROP VIEW IF EXISTS financial_transactions_view CASCADE;

SELECT 'Vista eliminada - ahora puedes ejecutar: npm run db:push' as status;