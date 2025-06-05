import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { ReceiptSystem } from "@/components/receipt-system"

export const metadata: Metadata = {
  title: "Recibos - Paradise Dance Academy",
  description: "Sistema de recibos digitales automáticos para pagos de mensualidades y clases de baile",
}

export default function ReceiptsPage() {
  return (
    <InternalLayout 
      title="Recibos" 
      description="Recibos digitales automáticos"
    >
      <ReceiptSystem />
    </InternalLayout>
  )
} 