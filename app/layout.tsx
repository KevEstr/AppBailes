import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/toaster"
import { GoogleMapsProvider } from "@/lib/google-maps-provider"
import AuthSessionProvider from "@/components/providers/session-provider"
import { PerformanceOptimizer } from "@/components/performance-optimizer"

// ⚡ FUENTE OPTIMIZADA CON PRELOAD
const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'arial', 'sans-serif']
})

export const metadata: Metadata = {
  title: {
    default: "Paradise - Sistema de Gestión",
    template: "%s | Paradise"
  },
  description: "Sistema completo de gestión para academias de baile. Controla asistencias, pagos, recibos, comunicaciones y análisis de estudiantes.",
  keywords: ["academia de baile", "gestión", "asistencias", "pagos", "recibos", "Paradise"],
  authors: [{ name: "Paradise" }],
  creator: "Paradise",
  publisher: "Paradise",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    title: "Paradise - Sistema de Gestión",
    description: "Sistema completo de gestión para academias de baile",
    type: "website",
    locale: "es_ES",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

// ⚡ VIEWPORT SEPARADO (CORRIGE ADVERTENCIA)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1f2937',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        {/* ⚡ PRELOAD CRÍTICO PARA FONTS */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* ⚡ PRELOAD RECURSOS CRÍTICOS */}
        <link rel="preload" href="/logo.jpg" as="image" type="image/jpeg" />
      </head>
      <body className="font-sans antialiased bg-gray-900 text-white">
        <AuthSessionProvider>
          <GoogleMapsProvider>
            {children}
          </GoogleMapsProvider>
          <Toaster />
          <PerformanceOptimizer />
        </AuthSessionProvider>
      </body>
    </html>
  )
}
