import React from "react"

interface LoadingProps {
  message?: string
}

export function Loading({ message = "Cargando..." }: LoadingProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <div className="text-white text-xl">{message}</div>
      </div>
    </div>
  )
} 