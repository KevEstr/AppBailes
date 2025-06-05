// 🚀 Sistema de Cache API Optimizado para Paradise Dance Academy

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

interface CacheConfig {
  ttl?: number // Time to live in milliseconds
  staleWhileRevalidate?: boolean // Return stale data while fetching new
}

class ApiCache {
  private cache = new Map<string, CacheEntry<any>>()
  private pendingRequests = new Map<string, Promise<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutos

  // 🚀 Método principal para fetch con cache
  async fetch<T>(url: string, options: RequestInit = {}, config: CacheConfig = {}): Promise<T> {
    const cacheKey = this.generateCacheKey(url, options)
    const ttl = config.ttl || this.defaultTTL
    const now = Date.now()

    // 1. Verificar cache existente
    const cached = this.cache.get(cacheKey)
    if (cached && now < cached.expiry) {
      return cached.data
    }

    // 2. Si hay datos stale pero válidos y se permite stale-while-revalidate
    if (cached && config.staleWhileRevalidate && now < cached.expiry + ttl) {
      // Retornar datos stale inmediatamente
      this.fetchAndCache(url, options, config, cacheKey, ttl) // Actualizar en background
      return cached.data
    }

    // 3. Verificar si ya hay una petición en curso
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!
    }

    // 4. Realizar nueva petición
    return this.fetchAndCache(url, options, config, cacheKey, ttl)
  }

  private async fetchAndCache<T>(
    url: string, 
    options: RequestInit, 
    config: CacheConfig, 
    cacheKey: string, 
    ttl: number
  ): Promise<T> {
    const fetchPromise = this.performFetch<T>(url, options)
    this.pendingRequests.set(cacheKey, fetchPromise)

    try {
      const data = await fetchPromise
      
      // Guardar en cache
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttl
      })

      return data
    } catch (error) {
      // En caso de error, intentar retornar datos de cache si existen
      const cached = this.cache.get(cacheKey)
      if (cached) {
        console.warn(`API error for ${url}, returning cached data:`, error)
        return cached.data
      }
      throw error
    } finally {
      this.pendingRequests.delete(cacheKey)
    }
  }

  private async performFetch<T>(url: string, options: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  private generateCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  // 🚀 Métodos de utilidad
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Precargar datos críticos
  async preload(urls: string[]): Promise<void> {
    try {
      await Promise.all(urls.map(url => this.fetch(url, {}, { ttl: 10 * 60 * 1000 })))
    } catch (error) {
      console.warn('Preload failed:', error)
    }
  }

  // Limpiar cache expirado
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key)
      }
    }
  }

  // Estadísticas del cache
  getStats() {
    const total = this.cache.size
    const now = Date.now()
    const valid = Array.from(this.cache.values()).filter(entry => now < entry.expiry).length
    const expired = total - valid

    return { total, valid, expired, hitRate: valid / total * 100 }
  }
}

// 🚀 Instancia global del cache
export const apiCache = new ApiCache()

// 🚀 Hook para usar el cache en componentes React
export function useApiCache<T>(
  url: string | null, 
  options: RequestInit = {}, 
  config: CacheConfig = {}
) {
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const fetchData = React.useCallback(async () => {
    if (!url) return

    setLoading(true)
    setError(null)

    try {
      const result = await apiCache.fetch<T>(url, options, config)
      setData(result)
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [url, JSON.stringify(options), JSON.stringify(config)])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// 🚀 Funciones de utilidad específicas para Paradise Dance Academy
export const paradiseApi = {
  // Clases
  getClasses: () => apiCache.fetch('/api/classes?active=true', {}, { ttl: 3 * 60 * 1000 }),
  getClassDetails: (id: number) => apiCache.fetch(`/api/classes/${id}`, {}, { ttl: 2 * 60 * 1000 }),
  
  // Estudiantes
  getStudents: () => apiCache.fetch('/api/students?active=true', {}, { ttl: 5 * 60 * 1000 }),
  
  // Instructores
  getTrainers: () => apiCache.fetch('/api/trainers?active=true', {}, { ttl: 10 * 60 * 1000 }),
  
  // Deudas (cache corto por ser crítico)
  getDebts: () => apiCache.fetch('/api/debts', {}, { ttl: 1 * 60 * 1000 }),
  
  // Asistencias por sesión
  getClassSession: (classId: number, date: string) => 
    apiCache.fetch(`/api/class-sessions?classId=${classId}&date=${date}`, {}, { ttl: 30 * 1000 }),
  
  // Precargar datos críticos
  preloadCriticalData: () => apiCache.preload([
    '/api/classes?active=true',
    '/api/students?active=true&details=false',
    '/api/trainers?active=true',
    '/api/debts'
  ])
}

// 🚀 Limpiar cache automáticamente cada 10 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 10 * 60 * 1000)
}

// Precargar datos al inicio
if (typeof window !== 'undefined') {
  setTimeout(() => {
    paradiseApi.preloadCriticalData()
  }, 1000)
} 