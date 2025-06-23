import { useState, useEffect, useCallback, useRef } from 'react'

interface ParadiseApiOptions {
  cacheTime?: number
  staleTime?: number
  retryCount?: number
  retryDelay?: number
  enabled?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  expires: number
  stale: number
}

interface ApiResponse<T> {
  data: T | null
  loading: boolean
  error: Error | null
  isStale: boolean
  refetch: () => Promise<void>
  mutate: (data: T) => void
  invalidate: () => void
}

// ⚡ CACHE GLOBAL MEJORADO CON LIMPIEZA AUTOMÁTICA
const apiCache = new Map<string, CacheEntry<any>>()
const pendingRequests = new Map<string, Promise<any>>()

// ⚡ CONFIGURACIÓN OPTIMIZADA POR ENDPOINT
const getOptimalConfig = (endpoint: string) => {
  // ⚡ Configuraciones específicas por tipo de datos
  if (endpoint.includes('debts')) {
    return { cacheTime: 30000, staleTime: 15000 } // 30s cache, 15s stale - datos que cambian frecuentemente
  }
  if (endpoint.includes('classes') && endpoint.includes('active=true')) {
    return { cacheTime: 120000, staleTime: 60000 } // 2min cache, 1min stale - clases activas
  }
  if (endpoint.includes('students') && endpoint.includes('details=false')) {
    return { cacheTime: 300000, staleTime: 180000 } // 5min cache, 3min stale - lista básica de estudiantes
  }
  if (endpoint.includes('attendance')) {
    return { cacheTime: 60000, staleTime: 30000 } // 1min cache, 30s stale - asistencias del día
  }
  if (endpoint.includes('count=true')) {
    return { cacheTime: 45000, staleTime: 20000 } // 45s cache, 20s stale - contadores rápidos
  }
  return { cacheTime: 90000, staleTime: 45000 } // Default: 1.5min cache, 45s stale
}

// ⚡ LIMPIEZA AUTOMÁTICA DE CACHE
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of apiCache.entries()) {
    if (now > entry.expires + 300000) { // Eliminar después de 5 minutos de expirado
      apiCache.delete(key)
    }
  }
}, 300000) // Ejecutar cada 5 minutos

export function useParadiseApi<T>(
  endpoint: string | null,
  options: ParadiseApiOptions = {}
): ApiResponse<T> {
  const optimalConfig = endpoint ? getOptimalConfig(endpoint) : { cacheTime: 90000, staleTime: 45000 }
  const {
    cacheTime = optimalConfig.cacheTime,
    staleTime = optimalConfig.staleTime,
    retryCount = 2, // Reducido de 3 a 2
    retryDelay = 1000,
    enabled = true,
    onSuccess,
    onError
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)

  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  // ⚡ FUNCIÓN DE FETCH OPTIMIZADA Y SIMPLIFICADA
  const fetchData = useCallback(async (forceRefresh = false): Promise<void> => {
    if (!endpoint || !enabled || !isMountedRef.current) return

    const cacheKey = endpoint
    const now = Date.now()
    const cached = apiCache.get(cacheKey)

    // ✅ VERIFICAR CACHE VÁLIDO PRIMERO
    if (!forceRefresh && cached && now < cached.expires) {
      if (isMountedRef.current) {
        setData(cached.data)
        setIsStale(now > cached.stale)
        setLoading(false)
        setError(null)
        onSuccess?.(cached.data)
      }
      return
    }

    // ✅ EVITAR REQUESTS DUPLICADOS
    const pendingRequest = pendingRequests.get(cacheKey)
    if (!forceRefresh && pendingRequest) {
      try {
        const result = await pendingRequest
        if (isMountedRef.current) {
          setData(result)
          setLoading(false)
          setError(null)
          setIsStale(false)
          onSuccess?.(result)
        }
        return
      } catch {
        // Si falla, continuar con nueva petición
      }
    }

    // ✅ CANCELAR PETICIÓN ANTERIOR
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    
    // ✅ MOSTRAR DATOS STALE SI EXISTEN
    if (!forceRefresh && cached && isMountedRef.current) {
      setData(cached.data)
      setIsStale(true)
      setError(null)
    }

    if (isMountedRef.current) {
      setLoading(true)
    }

    const fetchPromise = (async () => {
      try {
        // ⚡ TIMEOUT OPTIMIZADO POR TIPO
        const timeout = endpoint.includes('count=true') ? 3000 : 8000
        const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), timeout)

        const response = await fetch(`/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`, {
          signal: abortControllerRef.current?.signal,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=30'
          }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()

        // ⚡ ACTUALIZAR CACHE
        apiCache.set(cacheKey, {
          data: result,
          timestamp: now,
          expires: now + cacheTime,
          stale: now + staleTime
        })

        if (isMountedRef.current) {
          setData(result)
          setError(null)
          setIsStale(false)
          onSuccess?.(result)
        }

        return result
      } catch (err) {
        const error = err as Error
        
        if (error.name === 'AbortError' || !isMountedRef.current) {
          return
        }

        // ⚡ RETRY SIMPLIFICADO
        if (retryCount > 0 && !error.message.includes('401') && !error.message.includes('403')) {
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchData(forceRefresh)
            }
          }, retryDelay)
          return
        }

        // ⚡ FALLBACK A CACHE
        if (cached && isMountedRef.current) {
          setData(cached.data)
          setIsStale(true)
          setError(new Error(`Red: ${error.message} (cache)`))
        } else if (isMountedRef.current) {
          setError(error)
          setData(null)
        }

        onError?.(error)
        throw error
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
        pendingRequests.delete(cacheKey)
      }
    })()

    pendingRequests.set(cacheKey, fetchPromise)
    return fetchPromise
  }, [endpoint, enabled, cacheTime, staleTime, retryCount, retryDelay, onSuccess, onError])

  // ⚡ EFECTO OPTIMIZADO - SOLO UNA VEZ AL MONTAR
  useEffect(() => {
    isMountedRef.current = true
    fetchData()
    
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [endpoint, enabled]) // Solo dependencias esenciales

  // ⚡ FUNCIÓN MUTATE OPTIMIZADA
  const mutate = useCallback((newData: T) => {
    if (!endpoint || !isMountedRef.current) return

    const cacheKey = endpoint
    const now = Date.now()
    
    // Actualizar cache y estado
    apiCache.set(cacheKey, {
      data: newData,
      timestamp: now,
      expires: now + cacheTime,
      stale: now + staleTime
    })
    
    setData(newData)
    setIsStale(false)
    setError(null)
  }, [endpoint, cacheTime, staleTime])

  // ⚡ FUNCIÓN INVALIDATE OPTIMIZADA
  const invalidate = useCallback(() => {
    if (!endpoint) return
    apiCache.delete(endpoint)
    if (isMountedRef.current) {
      fetchData(true)
    }
  }, [endpoint, fetchData])

  return {
    data,
    loading,
    error,
    isStale,
    refetch: () => fetchData(true),
    mutate,
    invalidate
  }
}

// ⚡ FUNCIONES AUXILIARES OPTIMIZADAS
export const preloadParadiseData = async (endpoints: string[]) => {
  const promises = endpoints.map(endpoint => 
    fetch(`/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`, {
      headers: { 'Cache-Control': 'max-age=60' }
    }).catch(() => null)
  )
  
  try {
    await Promise.allSettled(promises)
  } catch {
    // Fallar silenciosamente
  }
}

export const invalidateParadiseCache = (patterns: string[]) => {
  for (const [key] of apiCache.entries()) {
    if (patterns.some(pattern => key.includes(pattern))) {
      apiCache.delete(key)
    }
  }
}

export const cleanupParadiseCache = () => {
  apiCache.clear()
  pendingRequests.clear()
} 