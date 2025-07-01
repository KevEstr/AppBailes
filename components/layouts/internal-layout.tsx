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
    'classes': 'Gestión de Clases',
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
      <div className="mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-[95%]">
        {/* Header with navigation */}
        <Card className="mb-8 rounded-2xl bg-gray-800/90 p-6 shadow-xl border border-gray-600 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button
                  variant="ghost"
                  className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 hover:text-white px-6 py-3 font-medium transition-all duration-300 border border-blue-500"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Inicio
                </Button>
              </Link>
              
              {/* Breadcrumbs */}
              <nav className="flex items-center space-x-2">
                {breadcrumbs.map((breadcrumb, index) => (
                  <div key={breadcrumb.href} className="flex items-center">
                    {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />}
                    {index === breadcrumbs.length - 1 ? (
                      <span className="text-white font-medium">{breadcrumb.name}</span>
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

            <div className="text-right">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hidden sm:block">
                {title}
              </h1>
              {description && (
                <p className="text-gray-300 text-sm mt-1 hidden sm:block">{description}</p>
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