import { InternalLayout } from "@/components/layouts/internal-layout"
import { ReceiptSystem } from "@/components/receipt-system"

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