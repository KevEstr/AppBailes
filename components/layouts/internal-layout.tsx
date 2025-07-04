"use client"

import { memo, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Home, ChevronRight } from "lucide-react"

interface InternalLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
}

export const InternalLayout = memo(function InternalLayout({ children, title, description }: InternalLayoutProps) {
  const pathname = usePathname()

  const segmentNames: Record<string, string> = useMemo(() => ({
    'attendance': 'Asistencia',
    'receipts': 'Recibos',
    'messages': 'Notificaciones',
    'history': 'Análisis',
    'debts': 'Control Pagos',
    'students': 'Gestión de Estudiantes',
    'enrollment': 'Inscripciones',
    'admin': 'Administración',
    'monthly-payments': 'Sistema de Mensualidades',
    'review': 'Revisión de Comprobantes'
  }), [])

  const getSegmentName = useMemo(() => (segment: string) => {
    return segmentNames[segment] || segment
  }, [segmentNames])

  const breadcrumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean)
    return [
      { name: 'Inicio', href: '/' },
      ...segments.map((segment, index) => ({
        name: getSegmentName(segment),
        href: '/' + segments.slice(0, index + 1).join('/')
      }))
    ]
  }, [pathname, getSegmentName])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="w-full mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header with navigation */}
        <Card className="mb-8 rounded-2xl bg-gray-800/90 p-4 sm:p-6 shadow-xl border border-gray-600 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Home button + breadcrumbs */}
            <div className="flex items-center space-x-4 flex-1 overflow-hidden">
              <Link href="/">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 hover:text-white px-2 py-2 text-xs sm:text-sm font-medium border border-blue-500"
                >
                  <Home className="w-4 h-4 mr-1" />
                  Inicio
                </Button>
              </Link>

              {/* Breadcrumbs */}
              <nav className="flex items-center flex-wrap gap-2 overflow-hidden text-xs sm:text-sm">
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={breadcrumb.href} className="flex items-center max-w-full">
                    {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-white font-medium text-xs sm:text-sm">{breadcrumb.name}</span>
                    ) : (
                      <Link
                        href={breadcrumb.href}
                        className="text-gray-300 hover:text-white transition-colors"
                      >
                        {breadcrumb.name}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            </div>

            {/* Right: Title / description (hidden on mobile) */}
            <div className="hidden sm:block text-right flex-shrink-0">
              <h1 className="text-base font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate max-w-xs lg:max-w-none">
                {title}
              </h1>
              {description && (
                <p className="text-gray-300 text-[11px] mt-1 truncate max-w-xs lg:max-w-none">
                  {description}
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Page content */}
        {children}
      </div>
    </div>
  )
})