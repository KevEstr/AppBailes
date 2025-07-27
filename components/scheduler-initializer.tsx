'use client';

import { useEffect } from 'react';
import { useSchedulerInitializer } from '@/lib/scheduler-initializer';

export function SchedulerInitializer() {
  useSchedulerInitializer();
  
  // Este componente no renderiza nada
  return null;
}
