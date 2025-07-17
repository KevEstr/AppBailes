"use client";

import { useEffect } from "react";

export function PerformanceOptimizer() {
  useEffect(() => {
    // ⚡ PRELOAD RUTAS CRÍTICAS AL HOVER
    const prefetchRoute = (url: string) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = url;
      link.onload = () => {
        // Remover el link después de un tiempo para no saturar el DOM
        setTimeout(() => document.head.removeChild(link), 5000);
      };
      document.head.appendChild(link);
    };

    // Prefetch en hover para navegación rápida
    const handleMouseOver = (e: Event) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href^="/"]') as HTMLAnchorElement;
      if (
        link &&
        !link.dataset.prefetched &&
        link.href !== window.location.href
      ) {
        link.dataset.prefetched = "true";
        prefetchRoute(link.href);
      }
    };

    // ⚡ SERVICE WORKER REGISTRATION (SOLO EN PRODUCCIÓN)
    const registerServiceWorker = async () => {
      if (
        "serviceWorker" in navigator &&
        process.env.NODE_ENV === "production"
      ) {
        try {
          await navigator.serviceWorker.register("/sw.js");
        } catch (error) {
          console.error("Error registering service worker:", error);
        }
      }
    };

    // ⚡ OPTIMIZACIONES DE PERFORMANCE
    const optimizePerformance = () => {
      // Preload next page on idle
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(() => {
          // Pre-warm critical resources
          const criticalRoutes = ["/classes", "/attendance", "/debts"];
          criticalRoutes.forEach((route) => {
            if (window.location.pathname !== route) {
              prefetchRoute(route);
            }
          });
        });
      }
    };

    // Agregar event listeners
    document.addEventListener("mouseover", handleMouseOver, { passive: true });

    // Ejecutar optimizaciones después de que la página esté cargada
    if (document.readyState === "complete") {
      registerServiceWorker();
      optimizePerformance();
    } else {
      window.addEventListener("load", () => {
        registerServiceWorker();
        optimizePerformance();
      });
    }

    // Cleanup
    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
    };
  }, []);

  // Este componente no renderiza nada
  return null;
}
