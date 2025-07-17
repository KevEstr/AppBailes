'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { GoogleMap, Marker } from '@react-google-maps/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MapPin, Search } from 'lucide-react'
import { useGoogleMaps } from '@/lib/google-maps-provider'

interface InteractiveMapProps {
  address: string
  latitude?: number
  longitude?: number
  onAddressChange: (address: string) => void
  onCoordinatesChange: (lat: number, lng: number) => void
  className?: string
}

// Coordenadas por defecto para Itagüí, Antioquia
const defaultCenter = {
  lat: 6.1844,
  lng: -75.5994
}

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
}

export function InteractiveMap({ 
  address, 
  latitude, 
  longitude, 
  onAddressChange, 
  onCoordinatesChange,
  className = ""
}: InteractiveMapProps) {
  // Usar el contexto centralizado de Google Maps
  const { isLoaded, loadError } = useGoogleMaps()

  // Generar un ID único para cada instancia del mapa
  const mapInstanceId = useMemo(() => `map-${Math.random().toString(36).substr(2, 9)}`, [])

  // Crear estilos únicos para cada instancia
  const mapContainerStyle = useMemo(() => ({
    width: '100%',
    height: '300px',
    borderRadius: '8px',
    position: 'relative' as const,
  }), [])

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  )
  const [searchAddress, setSearchAddress] = useState(address)
  const [isSearching, setIsSearching] = useState(false)

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    console.log(`Mapa cargado con ID: ${mapInstanceId}`)
    setMap(mapInstance)
  }, [mapInstanceId])

  const onUnmount = useCallback(() => {
    console.log(`Mapa desmontado con ID: ${mapInstanceId}`)
    setMap(null)
  }, [mapInstanceId])

  // Función para buscar dirección usando Geocoding API
  const searchLocation = async () => {
    if (!searchAddress.trim() || !map || !isLoaded) return
    
    setIsSearching(true)
    try {
      const geocoder = new google.maps.Geocoder()
      
      geocoder.geocode(
        { 
          address: `${searchAddress}, Itagüí, Antioquia, Colombia`,
          region: 'CO'
        },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location
            const lat = location.lat()
            const lng = location.lng()
            
            setMarker({ lat, lng })
            map.panTo({ lat, lng })
            map.setZoom(16)
            
            onCoordinatesChange(lat, lng)
            onAddressChange(searchAddress)
          } else {
            console.error('Geocoding failed:', status)
          }
          setIsSearching(false)
        }
      )
    } catch (error) {
      console.error('Error searching location:', error)
      setIsSearching(false)
    }
  }

  // Función para manejar clics en el mapa
  const onMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng && isLoaded && map) {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      
      setMarker({ lat, lng })
      onCoordinatesChange(lat, lng)
      
      // Reverse geocoding para obtener la dirección
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const formattedAddress = results[0].formatted_address
            setSearchAddress(formattedAddress)
            onAddressChange(formattedAddress)
          }
        }
      )
    }
  }, [map, onAddressChange, onCoordinatesChange, isLoaded])

  // Función para arrastrar el marcador
  const onMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng && isLoaded && map) {
      const lat = event.latLng.lat()
      const lng = event.latLng.lng()
      
      setMarker({ lat, lng })
      onCoordinatesChange(lat, lng)
      
      // Reverse geocoding
      const geocoder = new google.maps.Geocoder()
      geocoder.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const formattedAddress = results[0].formatted_address
            setSearchAddress(formattedAddress)
            onAddressChange(formattedAddress)
          }
        }
      )
    }
  }, [map, onAddressChange, onCoordinatesChange, isLoaded])

  // Actualizar searchAddress cuando cambie address desde afuera
  useEffect(() => {
    setSearchAddress(address)
  }, [address])

  // Manejar error de carga
  if (loadError) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <Label className="text-white mb-2 block">Dirección de residencia *</Label>
          <Input
            placeholder="Dirección completa"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div className="p-4 bg-red-100 border border-red-400 rounded-lg">
          <p className="text-red-800 text-sm">
            Error al cargar Google Maps. Por favor, verifica tu conexión o recarga la página.
          </p>
        </div>
      </div>
    )
  }

  // Mostrar mapa solo si hay API key
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <Label className="text-white mb-2 block">Dirección de residencia *</Label>
          <Input
            placeholder="Dirección completa"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <p className="text-yellow-800 text-sm">
            Para habilitar el mapa interactivo, configura NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env.local
          </p>
        </div>
      </div>
    )
  }

  // Mostrar loading mientras carga la API
  if (!isLoaded) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <Label className="text-white mb-2 block">Dirección de residencia *</Label>
          <Input
            placeholder="Dirección completa"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div className="p-4 bg-blue-100 border border-blue-400 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <p className="text-blue-800 text-sm">Cargando mapa interactivo...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Campo de búsqueda de dirección */}
      <div>
        <Label className="text-white mb-2 block">Dirección de residencia *</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Escribe la dirección completa"
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
            className="bg-gray-800 border-gray-600 text-white flex-1"
          />
          <Button
            type="button"
            onClick={searchLocation}
            disabled={isSearching}
            className="px-3"
            variant="outline"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Mapa interactivo */}
      <div>
        <Label className="text-white mb-2 block">
          Ubicación en el mapa {" "}
          <span className="text-gray-400 text-sm ml-2">
            (Haz clic en el mapa o arrastra el marcador para ajustar la ubicación)
          </span>
        </Label>
        <div key={mapInstanceId}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={marker || defaultCenter}
            zoom={marker ? 16 : 13}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onClick={onMapClick}
            options={mapOptions}
          >
            {marker && (
              <Marker
                position={marker}
                draggable={true}
                onDragEnd={onMarkerDragEnd}
                title="Ubicación seleccionada"
              />
            )}
          </GoogleMap>
        </div>
      </div>
    </div>
  )
} 