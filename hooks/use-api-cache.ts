import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

interface UseApiCacheOptions {
  cacheTime?: number // Tiempo en ms para mantener en cache (default: 5 minutos)
  staleTime?: number // Tiempo en ms antes de considerar los datos obsoletos (default: 1 minuto)
}

const cache = new Map<string, CacheEntry<any>>()
const pendingRequests = new Map<string, Promise<any>>()

export function useApiCache<T>(
  url: string,
  options: UseApiCacheOptions = {}
) {
  const { cacheTime = 5 * 60 * 1000, staleTime = 60 * 1000 } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!url) return

    const now = Date.now()
    const cacheKey = url
    const cached = cache.get(cacheKey)

    // Si tenemos datos en cache y no están expirados y no forzamos refresh
    if (cached && now - cached.timestamp < cached.expiry && !forceRefresh) {
      setData(cached.data)
      setLoading(false)
      setError(null)
      return cached.data
    }

    // Si ya hay una petición pendiente para esta URL, esperarla
    const pendingRequest = pendingRequests.get(cacheKey)
    if (pendingRequest && !forceRefresh) {
      try {
        const result = await pendingRequest
        setData(result)
        setLoading(false)
        setError(null)
        return result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
        setLoading(false)
        return null
      }
    }

    setLoading(true)
    setError(null)

    // Cancelar petición anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    const fetchPromise = (async () => {
      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        
        // Guardar en cache
        cache.set(cacheKey, {
          data: result,
          timestamp: now,
          expiry: cacheTime
        })

        setData(result)
        setError(null)
        return result
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null // Petición cancelada, no actualizar estado
        }
        
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        setError(errorMessage)
        throw err
      } finally {
        setLoading(false)
        pendingRequests.delete(cacheKey)
      }
    })()

    pendingRequests.set(cacheKey, fetchPromise)

    try {
      return await fetchPromise
    } catch (err) {
      return null
    }
  }, [url, cacheTime])

  // Función para invalidar cache
  const invalidateCache = useCallback(() => {
    if (url) {
      cache.delete(url)
    }
  }, [url])

  // Función para refrescar datos
  const refresh = useCallback(() => {
    return fetchData(true)
  }, [fetchData])

  // Cargar datos al montar o cambiar URL
  useEffect(() => {
    fetchData()

    // Cleanup al desmontar
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchData])

  // Verificar si los datos están obsoletos
  const isStale = useCallback(() => {
    if (!url) return false
    const cached = cache.get(url)
    if (!cached) return true
    return Date.now() - cached.timestamp > staleTime
  }, [url, staleTime])

  return {
    data,
    loading,
    error,
    refresh,
    invalidateCache,
    isStale: isStale()
  }
}

// Hook específico para APIs de Paradise Dance Academy
export function useParadiseApi<T>(endpoint: string, options?: UseApiCacheOptions) {
  return useApiCache<T>(`/api/${endpoint}`, options)
}

// Función para limpiar cache viejo
export function cleanOldCache() {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.expiry) {
      cache.delete(key)
    }
  }
}

// Limpiar cache cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(cleanOldCache, 10 * 60 * 1000)
} 