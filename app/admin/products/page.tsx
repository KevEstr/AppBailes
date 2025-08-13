"use client"

import ProductsManagement from "@/components/admin/ProductsManagement"
import { InternalLayout } from "@/components/layouts/internal-layout"

export default function ProductsManagementPage() {
  return (
    <InternalLayout 
      title="Administración de Productos" 
      description="Gestiona el inventario de productos y snacks"
    >
      <ProductsManagement />
    </InternalLayout>
  )
}
