"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MapPin, Search, ChevronDown } from "lucide-react";
import { useGoogleMaps } from "@/lib/google-maps-provider";

interface InteractiveMapProps {
  address: string;
  latitude?: number;
  longitude?: number;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (lat: number, lng: number) => void;
  className?: string;
}

// Coordenadas por defecto para Itagüí, Antioquia
const defaultCenter = {
  lat: 6.1844,
  lng: -75.5994,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

export function InteractiveMap({
  address,
  latitude,
  longitude,
  onAddressChange,
  onCoordinatesChange,
  className = "",
}: InteractiveMapProps) {
  // Usar el contexto centralizado de Google Maps
  const { isLoaded, loadError } = useGoogleMaps();

  // Generar un ID único para cada instancia del mapa
  const mapInstanceId = useMemo(
    () => `map-${Math.random().toString(36).slice(2, 11)}`,
    []
  );

  // Crear estilos únicos para cada instancia
  const mapContainerStyle = useMemo(
    () => ({
      width: "100%",
      height: "300px",
      borderRadius: "8px",
      position: "relative" as const,
    }),
    []
  );

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  );
  const [searchAddress, setSearchAddress] = useState(address);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      console.log(`Mapa cargado con ID: ${mapInstanceId}`);
      setMap(mapInstance);
    },
    [mapInstanceId]
  );

  const onUnmount = useCallback(() => {
    console.log(`Mapa desmontado con ID: ${mapInstanceId}`);
    setMap(null);
  }, [mapInstanceId]);

  // Función para obtener sugerencias de direcciones
  const getAddressSuggestions = useCallback((input: string) => {
    if (!input.trim() || !isLoaded) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const service = new google.maps.places.AutocompleteService();
      service.getPlacePredictions(
        {
          input: input,
          componentRestrictions: { country: 'CO' }
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
            setSelectedSuggestionIndex(-1);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (error) {
      console.error('Error getting suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [isLoaded]);

  // Función para seleccionar una sugerencia
  const selectSuggestion = useCallback((prediction: google.maps.places.AutocompletePrediction) => {
    if (!map) return;
    
    try {
      const service = new google.maps.places.PlacesService(map);
      service.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['geometry', 'formatted_address']
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            
            setMarker({ lat, lng });
            map.panTo({ lat, lng });
            map.setZoom(16);
            
            const address = place.formatted_address || prediction.description;
            setSearchAddress(address);
            onAddressChange(address);
            onCoordinatesChange(lat, lng);
            
            setShowSuggestions(false);
            setSuggestions([]);
          }
        }
      );
    } catch (error) {
      console.error('Error selecting suggestion:', error);
    }
  }, [map, onAddressChange, onCoordinatesChange]);

  // Función para buscar dirección usando Geocoding API (fallback)
  const searchLocation = async () => {
    if (!searchAddress.trim() || !map || !isLoaded) return;

    setIsSearching(true);
    try {
      const geocoder = new google.maps.Geocoder();

      geocoder.geocode(
        {
          address: searchAddress,
          region: "CO",
        },
        (results, status) => {
          if (status === "OK" && results && results[0]) {
            const location = results[0].geometry.location;
            const lat = location.lat();
            const lng = location.lng();

            setMarker({ lat, lng });
            map.panTo({ lat, lng });
            map.setZoom(16);

            onCoordinatesChange(lat, lng);
            onAddressChange(searchAddress);
          } else {
            console.error("Geocoding failed:", status);
          }
          setIsSearching(false);
        }
      );
    } catch (error) {
      console.error("Error searching location:", error);
      setIsSearching(false);
    }
  };

  // Función para manejar clics en el mapa
  const onMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng && isLoaded && map) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        setMarker({ lat, lng });
        onCoordinatesChange(lat, lng);

        // Reverse geocoding para obtener la dirección
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const formattedAddress = results[0].formatted_address;
            setSearchAddress(formattedAddress);
            onAddressChange(formattedAddress);
          }
        });
      }
    },
    [map, onAddressChange, onCoordinatesChange, isLoaded]
  );

  // Función para arrastrar el marcador
  const onMarkerDragEnd = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng && isLoaded && map) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        setMarker({ lat, lng });
        onCoordinatesChange(lat, lng);

        // Reverse geocoding
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            const formattedAddress = results[0].formatted_address;
            setSearchAddress(formattedAddress);
            onAddressChange(formattedAddress);
          }
        });
      }
    },
    [map, onAddressChange, onCoordinatesChange, isLoaded]
  );

  // Actualizar searchAddress cuando cambie address desde afuera
  useEffect(() => {
    setSearchAddress(address);
  }, [address]);

  // Manejar cambios en el input para obtener sugerencias
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getAddressSuggestions(searchAddress);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [searchAddress, getAddressSuggestions]);

  // Manejar navegación con teclado en las sugerencias
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          searchLocation();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar error de carga
  if (loadError) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <Label className="text-white mb-2 block">
            Dirección de residencia *
          </Label>
          <Input
            placeholder="Dirección completa"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div className="p-4 bg-red-100 border border-red-400 rounded-lg">
          <p className="text-red-800 text-sm">
            Error al cargar Google Maps. Por favor, verifica tu conexión o
            recarga la página.
          </p>
        </div>
      </div>
    );
  }

  // Mostrar mapa solo si hay API key
  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <Label className="text-white mb-2 block">
            Dirección de residencia *
          </Label>
          <Input
            placeholder="Dirección completa"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
        </div>
        <div className="p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <p className="text-yellow-800 text-sm">
            Para habilitar el mapa interactivo, configura
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en tu archivo .env.local
          </p>
        </div>
      </div>
    );
  }

  // Mostrar loading mientras carga la API
  if (!isLoaded) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <Label className="text-white mb-2 block">
            Dirección de residencia *
          </Label>
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
            <p className="text-blue-800 text-sm">
              Cargando mapa interactivo...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Campo de búsqueda de dirección con autocompletado */}
      <div className="relative">
        <Label className="text-white mb-2 block">
          Dirección de residencia *
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder="Escribe para ver sugerencias de direcciones..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              className="bg-gray-800 border-gray-600 text-white pr-8"
            />
            {suggestions.length > 0 && (
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            )}
            
            {/* Lista de sugerencias */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.place_id}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-700 transition-colors ${
                      index === selectedSuggestionIndex ? 'bg-gray-700' : ''
                    }`}
                    onClick={() => selectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {suggestion.structured_formatting?.main_text || suggestion.description}
                        </div>
                        {suggestion.structured_formatting?.secondary_text && (
                          <div className="text-gray-400 text-xs truncate">
                            {suggestion.structured_formatting.secondary_text}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          Ubicación en el mapa{" "}
          <span className="text-gray-400 text-sm ml-2">
            (Selecciona una sugerencia o haz clic en el mapa para ajustar la ubicación)
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
  );
}
