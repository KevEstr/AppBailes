import { useState, useEffect, useRef, useCallback } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  loading: boolean
}

// Cache global para evitar llamadas duplicadas
const cache = new Map<string, CacheEntry<any>>()
const pendingRequests = new Map<string, Promise<any>>()

interface UseOptimizedFetchOptions {
  cacheTime?: number // Tiempo de cache en ms (default: 10 minutos)
  staleTime?: number // Tiempo hasta que se considera stale (default: 2 minutos)
  refetchOnWindowFocus?: boolean
  enabled?: boolean
}

interface UseOptimizedFetchResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  invalidate: () => void
}

export function useOptimizedFetch<T>(
  url: string,
  options: UseOptimizedFetchOptions = {}
): UseOptimizedFetchResult<T> {
  const {
    cacheTime = 10 * 60 * 1000, // 10 minutos
    staleTime = 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus = false,
    enabled = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return

    const now = Date.now()
    const cached = cache.get(url)

    // Si hay datos en cache y no están expirados y no es forzado
    if (cached && !force && (now - cached.timestamp) < cacheTime) {
      setData(cached.data)
      setLoading(false)
      setError(null)
      return
    }

    // Si hay una petición pendiente para esta URL, esperarla
    const pendingRequest = pendingRequests.get(url)
    if (pendingRequest && !force) {
      try {
        const result = await pendingRequest
        setData(result)
        setLoading(false)
        setError(null)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
      return
    }

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setLoading(true)
    setError(null)

    const fetchPromise = (async () => {
      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal,
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        // Actualizar cache
        cache.set(url, {
          data: result,
          timestamp: now,
          loading: false
        })

        return result
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          throw err
        }
        
        // En caso de error, mantener datos de cache si están disponibles y son recientes
        if (cached && (now - cached.timestamp) < cacheTime * 2) {
          return cached.data
        }
        
        throw err
      } finally {
        pendingRequests.delete(url)
      }
    })()

    pendingRequests.set(url, fetchPromise)

    try {
      const result = await fetchPromise
      if (!abortControllerRef.current?.signal.aborted) {
        setData(result)
        setLoading(false)
      }
    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError(err as Error)
        setLoading(false)
      }
    }
  }, [url, enabled, cacheTime])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  const invalidate = useCallback(() => {
    cache.delete(url)
    pendingRequests.delete(url)
  }, [url])

  // Efecto para cargar datos iniciales
  useEffect(() => {
    fetchData()

    // Cleanup al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  // Efecto para refetch cuando se enfoca la ventana
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      const cached = cache.get(url)
      if (cached && (Date.now() - cached.timestamp) > staleTime) {
        fetchData()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnWindowFocus, staleTime, url, fetchData])

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  }
}

// Hook específico para APIs de Paradise Dance Academy
export function useParadiseApi<T>(endpoint: string, options?: UseOptimizedFetchOptions) {
  const url = `/api/${endpoint}`
  return useOptimizedFetch<T>(url, options)
}

// Utilidad para invalidar cache por patrón
export function invalidateCache(pattern?: string) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key)
        pendingRequests.delete(key)
      }
    }
  } else {
    cache.clear()
    pendingRequests.clear()
  }
}

// Utilidad para precargar datos
export async function preloadData(url: string) {
  const cached = cache.get(url)
  const now = Date.now()
  
  if (!cached || (now - cached.timestamp) > 30000) { // 30 segundos
    try {
      const response = await fetch(url)
      const data = await response.json()
      cache.set(url, {
        data,
        timestamp: now,
        loading: false
      })
    } catch (error) {
      console.warn('Failed to preload data for', url, error)
    }
  }
} 