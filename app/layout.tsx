import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/toaster"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: {
    default: "Paradise Dance Academy - Sistema de Gestión",
    template: "%s | Paradise Dance Academy"
  },
  description: "Sistema completo de gestión para academias de baile. Controla asistencias, pagos, recibos, comunicaciones y análisis de estudiantes.",
  keywords: ["academia de baile", "gestión", "asistencias", "pagos", "recibos", "Paradise Dance Academy"],
  authors: [{ name: "Paradise Dance Academy" }],
  creator: "Paradise Dance Academy",
  publisher: "Paradise Dance Academy",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: "Paradise Dance Academy - Sistema de Gestión",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
