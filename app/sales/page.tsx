"use client"

import { InternalLayout } from "@/components/layouts/internal-layout"
import ProductsSales from "@/components/sales/ProductsSales"

export default function SalesPage() {
  return (
    <InternalLayout title="Ventas de Productos" description="Registra ventas de productos (Admin y Profesor)">
      <ProductsSales />
    </InternalLayout>
  )
}


