"use client"

import { useEffect } from "react"
import { preloadData } from "@/hooks/use-optimized-fetch"

export function DataPreloader() {
  useEffect(() => {
    // Precargar datos críticos al iniciar la app
    const preloadCriticalData = async () => {
      try {
        // Precargar datos básicos que se usan en múltiples páginas
        await Promise.all([
          preloadData('/api/debts?count=true'),
          preloadData('/api/classes?active=true&details=false'),
          preloadData('/api/students?active=true&details=false'),
          preloadData('/api/trainers?active=true&details=false')
        ])
        
        console.log('✅ Datos críticos precargados')
      } catch (error) {
        console.warn('⚠️ Error precargando datos:', error)
      }
    }

    // Precargar después de un pequeño delay para no bloquear la UI inicial
    setTimeout(preloadCriticalData, 100)
  }, [])

  return null // Este componente no renderiza nada
} 