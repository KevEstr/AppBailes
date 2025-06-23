/**
 * Tipos TypeScript para el sistema de clases con deportes
 */

export interface Trainer {
  id: number
  name: string
  email: string
}

export interface Student {
  id: number // Cédula del estudiante
  name: string
  email: string
  phone: string
  avatar?: string
  hasDebt: boolean
}

export interface ClassSchedule {
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface DanceClass {
  id: number
  name: string
  description?: string
  capacity: number
  price?: number
  sport: 'DANCE' | 'VOLLEYBALL'
  modality?: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  trainer: Trainer
  schedules: ClassSchedule[]
  enrollments: {
    student: Student
  }[]
  _count: {
    enrollments: number
  }
}

export interface CreateClassData {
  name: string
  description: string
  trainerId: number
  capacity: number
  price: number
  sport: 'DANCE' | 'VOLLEYBALL'
  modality: string
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  schedules: ClassSchedule[]
}

export const DAYS_OF_WEEK = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
] as const 