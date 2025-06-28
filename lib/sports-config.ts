/**
 * Configuración de deportes y modalidades para Paradise Dance Academy
 */

export interface SportModalityConfig {
  sport: 'DANCE' | 'VOLLEYBALL'
  label: string
  icon: string
  color: string
  modalities: {
    id: string
    label: string
    description: string
  }[]
}

export const SPORTS_CONFIG: SportModalityConfig[] = [
  {
    sport: 'DANCE',
    label: 'Baile',
    icon: '💃',
    color: 'from-pink-500 to-purple-600',
    modalities: [
      {
        id: 'salsa',
        label: 'Salsa',
        description: 'Ritmo caribeño lleno de energía y pasión'
      },
      {
        id: 'bachata',
        label: 'Bachata',
        description: 'Sensual y romántico, fácil de aprender'
      },
      {
        id: 'merengue',
        label: 'Merengue',
        description: 'Alegre y divertido, perfecto para principiantes'
      },
      {
        id: 'reggaeton',
        label: 'Reggaetón',
        description: 'Urbano y moderno, ideal para jóvenes'
      },
      {
        id: 'kizomba',
        label: 'Kizomba',
        description: 'Elegante y sofisticado, de origen africano'
      },
      {
        id: 'cumbia',
        label: 'Cumbia',
        description: 'Tradicional colombiano, lleno de cultura'
      }
    ]
  },
  {
    sport: 'VOLLEYBALL',
    label: 'Voleibol',
    icon: '🏐',
    color: 'from-blue-500 to-green-600',
    modalities: [
      {
        id: 'indoor',
        label: 'Voleibol Indoor',
        description: 'Modalidad tradicional en cancha cubierta'
      },
      {
        id: 'beach',
        label: 'Voleibol Playa',
        description: 'Modalidad outdoor en arena, 2 vs 2'
      },
      {
        id: 'sitting',
        label: 'Voleibol Sentado',
        description: 'Modalidad adaptada para deportistas especiales'
      },
      {
        id: 'mini',
        label: 'Mini Voleibol',
        description: 'Adaptado para niños y principiantes'
      }
    ]
  }
]

export const CLASS_LEVELS = [
  {
    id: 'BEGINNER',
    label: 'Principiante',
    description: 'Para personas sin experiencia previa',
    color: 'bg-green-500'
  },
  {
    id: 'INTERMEDIATE',
    label: 'Intermedio',
    description: 'Con conocimientos básicos del deporte',
    color: 'bg-yellow-500'
  },
  {
    id: 'ADVANCED',
    label: 'Avanzado',
    description: 'Para deportistas experimentados',
    color: 'bg-red-500'
  }
] as const

/**
 * Obtiene las modalidades de un deporte específico
 */
export function getModalitiesBySport(sport: 'DANCE' | 'VOLLEYBALL') {
  return SPORTS_CONFIG.find(config => config.sport === sport)?.modalities || []
}

/**
 * Obtiene la configuración completa de un deporte
 */
export function getSportConfig(sport: 'DANCE' | 'VOLLEYBALL') {
  return SPORTS_CONFIG.find(config => config.sport === sport)
}

/**
 * Obtiene la información de un nivel específico
 */
export function getLevelInfo(level: string) {
  return CLASS_LEVELS.find(levelInfo => levelInfo.id === level)
}

/**
 * Obtiene todas las modalidades de todos los deportes
 */
export function getAllModalities() {
  return SPORTS_CONFIG.flatMap(sport => 
    sport.modalities.map(modality => ({
      ...modality,
      sport: sport.sport,
      sportLabel: sport.label
    }))
  )
} 