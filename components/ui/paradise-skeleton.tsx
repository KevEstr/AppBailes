import { memo } from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface SkeletonProps {
  className?: string
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button'
  width?: string | number
  height?: string | number
  rows?: number
}

// ⚡ COMPONENTE BASE SKELETON OPTIMIZADO
export const SkeletonComponent = memo(function SkeletonComponent({
  className,
  variant = 'default',
  width,
  height,
  ...props
}: SkeletonProps & React.HTMLAttributes<HTMLDivElement>) {
  const baseClasses = "animate-pulse rounded-md bg-muted"
  
  const variantClasses = {
    default: "",
    card: "h-24 w-full",
    text: "h-4 w-full",
    avatar: "h-12 w-12 rounded-full",
    button: "h-10 w-20"
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
      {...props}
    />
  )
})

// ⚡ SKELETON PARA TARJETAS DE CLASES
export const ClassCardSkeleton = memo(function ClassCardSkeleton() {
  return (
    <div className="animate-pulse border-0 shadow-xl rounded-3xl bg-gray-800/80 border border-gray-600 backdrop-blur-sm p-8">
      <div className="flex items-center space-x-6">
        <SkeletonComponent variant="avatar" className="w-16 h-16 bg-gray-600" />
        <div className="flex-1 space-y-3">
          <SkeletonComponent className="h-5 bg-gray-600 w-3/4" />
          <SkeletonComponent className="h-4 bg-gray-600 w-1/2" />
          <div className="flex space-x-2">
            <SkeletonComponent className="h-6 w-16 bg-gray-600 rounded-full" />
            <SkeletonComponent className="h-6 w-20 bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
})

// ⚡ SKELETON PARA ESTUDIANTES
export const StudentCardSkeleton = memo(function StudentCardSkeleton() {
  return (
    <div className="animate-pulse p-4 border rounded-lg bg-gray-800/50">
      <div className="flex items-center space-x-4">
        <SkeletonComponent variant="avatar" className="w-12 h-12 bg-gray-600" />
        <div className="flex-1 space-y-2">
          <SkeletonComponent className="h-4 bg-gray-600 w-32" />
          <SkeletonComponent className="h-3 bg-gray-600 w-24" />
        </div>
        <SkeletonComponent className="h-8 w-20 bg-gray-600 rounded" />
      </div>
    </div>
  )
})

// ⚡ SKELETON PARA TABLA DE ASISTENCIA
export const AttendanceTableSkeleton = memo(function AttendanceTableSkeleton({
  rows = 5
}: {
  rows?: number
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-lg">
        <SkeletonComponent className="h-4 bg-gray-600" />
        <SkeletonComponent className="h-4 bg-gray-600" />
        <SkeletonComponent className="h-4 bg-gray-600" />
        <SkeletonComponent className="h-4 bg-gray-600" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
          <div className="flex items-center space-x-2">
            <SkeletonComponent variant="avatar" className="w-8 h-8 bg-gray-600" />
            <SkeletonComponent className="h-4 bg-gray-600 flex-1" />
          </div>
          <SkeletonComponent className="h-4 bg-gray-600" />
          <SkeletonComponent className="h-6 w-16 bg-gray-600 rounded-full" />
          <SkeletonComponent className="h-8 w-20 bg-gray-600 rounded" />
        </div>
      ))}
    </div>
  )
})

// ⚡ SKELETON PARA DASHBOARD FINANCIERO
export const FinancialDashboardSkeleton = memo(function FinancialDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse p-6 bg-gray-800/50 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <SkeletonComponent className="h-6 w-6 bg-gray-600 rounded" />
              <SkeletonComponent className="h-4 w-16 bg-gray-600" />
            </div>
            <SkeletonComponent className="h-8 w-24 bg-gray-600 mb-2" />
            <SkeletonComponent className="h-4 w-32 bg-gray-600" />
          </div>
        ))}
      </div>
      
      {/* Gráfico */}
      <div className="animate-pulse p-6 bg-gray-800/50 rounded-xl">
        <SkeletonComponent className="h-6 w-48 bg-gray-600 mb-4" />
        <SkeletonComponent className="h-64 w-full bg-gray-600" />
      </div>
      
      {/* Tabla de transacciones */}
      <div className="animate-pulse p-6 bg-gray-800/50 rounded-xl">
        <SkeletonComponent className="h-6 w-40 bg-gray-600 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <SkeletonComponent className="h-10 w-10 bg-gray-600 rounded" />
                <div className="space-y-1">
                  <SkeletonComponent className="h-4 w-32 bg-gray-600" />
                  <SkeletonComponent className="h-3 w-24 bg-gray-600" />
                </div>
              </div>
              <SkeletonComponent className="h-6 w-20 bg-gray-600" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

// ⚡ SKELETON PARA GRID DE FUNCIONALIDADES
export const FeatureGridSkeleton = memo(function FeatureGridSkeleton({
  count = 6
}: {
  count?: number
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse group relative overflow-hidden rounded-3xl bg-gray-800/80 border border-gray-600 backdrop-blur-sm p-8 transition-all duration-300">
          <div className="flex items-center space-x-4 mb-6">
            <SkeletonComponent className="h-12 w-12 bg-gray-600 rounded-xl" />
            <div className="space-y-2">
              <SkeletonComponent className="h-6 w-32 bg-gray-600" />
              <SkeletonComponent className="h-4 w-24 bg-gray-600" />
            </div>
          </div>
          <SkeletonComponent className="h-4 w-full bg-gray-600 mb-2" />
          <SkeletonComponent className="h-4 w-3/4 bg-gray-600 mb-4" />
          <SkeletonComponent className="h-10 w-full bg-gray-600 rounded-lg" />
        </div>
      ))}
    </div>
  )
})

// ⚡ SKELETON PARA MENSAJES MASIVOS
export const MassiveMessagesSkeleton = memo(function MassiveMessagesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Formulario */}
      <div className="animate-pulse p-6 bg-gray-800/50 rounded-xl space-y-4">
        <SkeletonComponent className="h-6 w-40 bg-gray-600" />
        <SkeletonComponent className="h-32 w-full bg-gray-600 rounded" />
        <div className="flex space-x-4">
          <SkeletonComponent className="h-10 w-32 bg-gray-600 rounded" />
          <SkeletonComponent className="h-10 w-24 bg-gray-600 rounded" />
        </div>
      </div>
      
      {/* Lista de estudiantes */}
      <div className="animate-pulse p-6 bg-gray-800/50 rounded-xl">
        <SkeletonComponent className="h-6 w-32 bg-gray-600 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StudentCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
})

// ⚡ TEXTO SKELETON CON MÚLTIPLES LÍNEAS
export const TextSkeleton = memo(function TextSkeleton({
  rows = 3,
  className
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonComponent 
          key={i}
          className={cn(
            "h-4 bg-gray-600",
            i === rows - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
})

// ⚡ SKELETON OPTIMIZADO PARA CARDS DE MENU
export function MenuCardSkeleton() {
  return (
    <div className="group relative overflow-hidden border-0 bg-gray-800/90 shadow-2xl rounded-2xl border border-gray-600 backdrop-blur-sm h-full p-8">
      <div className="flex items-start justify-between mb-6">
        <Skeleton className="h-16 w-16 rounded-2xl bg-gray-700" />
        <Skeleton className="h-6 w-20 rounded-full bg-gray-700" />
      </div>
      <Skeleton className="h-6 w-3/4 mb-3 bg-gray-700" />
      <Skeleton className="h-4 w-full mb-2 bg-gray-700" />
      <Skeleton className="h-4 w-2/3 mb-4 bg-gray-700" />
      <div className="flex items-center">
        <Skeleton className="h-4 w-16 bg-gray-700" />
        <Skeleton className="ml-2 h-4 w-4 bg-gray-700" />
      </div>
    </div>
  )
}

// ⚡ SKELETON PARA GRIDS DE CARDS
export function MenuGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }, (_, i) => (
        <MenuCardSkeleton key={i} />
      ))}
    </div>
  )
}

// ⚡ SKELETON PARA HEADER PRINCIPAL
export function HeaderSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gray-800/90 p-12 text-center border border-gray-600 shadow-2xl backdrop-blur-sm">
      <div className="relative z-10">
        <Skeleton className="mb-8 mx-auto h-32 w-32 rounded-full bg-gray-700" />
        <Skeleton className="mb-4 h-12 w-3/4 mx-auto bg-gray-700" />
        <Skeleton className="mb-6 h-6 w-1/2 mx-auto bg-gray-700" />
        <Skeleton className="h-12 w-48 mx-auto rounded-full bg-gray-700" />
      </div>
    </div>
  )
}

// ⚡ SKELETON PARA TABLA DE DATOS
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-800 rounded-lg">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-6 bg-gray-700" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 bg-gray-800/50 rounded-lg">
          {Array.from({ length: cols }, (_, j) => (
            <Skeleton key={j} className="h-5 bg-gray-700" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ⚡ SKELETON PARA FORMULARIOS
export function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24 bg-gray-700" />
        <Skeleton className="h-10 w-full bg-gray-700" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 bg-gray-700" />
        <Skeleton className="h-10 w-full bg-gray-700" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28 bg-gray-700" />
        <Skeleton className="h-24 w-full bg-gray-700" />
      </div>
      <Skeleton className="h-10 w-32 bg-gray-700" />
    </div>
  )
}

// ⚡ SKELETON PARA STATS/MÉTRICAS
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="bg-gray-800 p-6 rounded-lg border border-gray-600">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-8 w-8 bg-gray-700" />
            <Skeleton className="h-6 w-6 bg-gray-700" />
          </div>
          <Skeleton className="h-8 w-16 mb-2 bg-gray-700" />
          <Skeleton className="h-4 w-24 bg-gray-700" />
        </div>
      ))}
    </div>
  )
}

// ⚡ SKELETON COMPLETO PARA PÁGINAS
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="container mx-auto px-6 py-8 space-y-12">
        <HeaderSkeleton />
        <MenuGridSkeleton />
      </div>
    </div>
  )
}

// ⚡ SKELETON ESPECÍFICO PARA PARADISE LOADING
export function ParadiseSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center space-x-2">
        <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
        <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        <div className="h-2 w-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
      </div>
      <SkeletonComponent className="h-4 w-48 bg-gray-600 mx-auto" />
    </div>
  )
}

export default SkeletonComponent 