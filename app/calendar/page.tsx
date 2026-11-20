import { Metadata } from "next"
import { InternalLayout } from "@/components/layouts/internal-layout"
import { CalendarView } from "@/components/calendar/calendar-view"
import { AuthGuard } from "@/components/auth-guard"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Calendario de Cumpleaños - Paradise",
  description: "Visualiza los cumpleaños de deportistas y profesores",
}

function CalendarContent() {
  return (
    <InternalLayout
      title="Calendario de Cumpleaños"
      description="Cumpleaños de deportistas y profesores"
    >
      <CalendarView />
    </InternalLayout>
  )
}

export default function CalendarPage() {
  return (
    <AuthGuard>
      <CalendarContent />
    </AuthGuard>
  )
}