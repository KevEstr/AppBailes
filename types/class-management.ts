export interface Student {
  id: number;
  name: string;
  phone: string;
  avatar?: string;
  hasDebt: boolean;
  user?: { email: string };
}

export interface Trainer {
  id: number;
  name: string;
  email: string;
}

export interface Location {
  id: number;
  name: string;
  address?: string;
}

export interface ClassSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface DanceClass {
  id: number;
  name: string;
  description?: string;
  capacity: number;
  price?: number;
  sport: "DANCE" | "VOLLEYBALL";
  level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  trainer: Trainer;
  location?: Location;
  schedules: ClassSchedule[];
  enrollments: {
    id: number;
    student: Student;
  }[];
  _count: {
    enrollments: number;
  };
} 