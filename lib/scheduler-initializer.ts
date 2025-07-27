import { paymentSchedulerService } from '@/lib/payment-scheduler-service';

// Función para inicializar el scheduler automáticamente
export function initializeScheduler() {
  // Solo inicializar en producción o si la variable está habilitada
  const shouldAutoStart = process.env.NODE_ENV === 'production' || 
                          process.env.AUTO_START_SCHEDULER === 'true';

  if (shouldAutoStart) {
    console.log('🚀 Inicializando Payment Scheduler automáticamente...');
    
    // Esperar un poco para que la app termine de arrancar
    setTimeout(() => {
      try {
        paymentSchedulerService.start();
        console.log('✅ Payment Scheduler iniciado automáticamente');
      } catch (error) {
        console.error('❌ Error iniciando Payment Scheduler:', error);
      }
    }, 5000); // 5 segundos de delay
  } else {
    console.log('ℹ️ Scheduler no se inicia automáticamente en desarrollo');
    console.log('💡 Para iniciarlo automáticamente, configura AUTO_START_SCHEDULER=true en .env');
  }
}

// Hook para componentes React
export function useSchedulerInitializer() {
  // Solo ejecutar una vez cuando el componente se monta
  if (typeof window !== 'undefined') {
    // Solo en el cliente
    const hasInitialized = sessionStorage.getItem('scheduler-initialized');
    
    if (!hasInitialized) {
      initializeScheduler();
      sessionStorage.setItem('scheduler-initialized', 'true');
    }
  }
}
