import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// ⚡ CACHE DE RUTAS PARA EVITAR VERIFICACIONES REPETIDAS
const ADMIN_ROUTES = ["/admin", "/receipts", "/messages", "/debts", "/history"]
const SHARED_ROUTES = ["/classes", "/attendance"]
const TEACHER_ROUTES = ["/teacher"]
const PUBLIC_ROUTES = ["/login"]  // ⚡ REMOVIDO "/" de rutas públicas - ahora requiere autenticación

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // ⚡ SKIP MIDDLEWARE PARA RUTAS ESTÁTICAS Y API AUTH
    if (pathname.startsWith("/_next") || 
        pathname.startsWith("/api/auth") || 
        pathname.includes(".")) {
      return NextResponse.next()
    }

    // ⚡ OPTIMIZACIÓN: Solo log en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log("🔒 Middleware:", { pathname, role: token?.role })
    }

    // ⚡ REDIRECCIÓN AUTOMÁTICA DE PÁGINA PRINCIPAL AL LOGIN (SIN AUTENTICACIÓN)
    if (pathname === "/" && !token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ⚡ REDIRECCIÓN OPTIMIZADA PARA LOGIN CON TOKEN VÁLIDO
    if (pathname === "/login" && token) {
      const redirectUrl = token.role === "ADMIN" ? "/admin" : "/teacher"
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }

    // ⚡ REDIRECCIÓN DE PÁGINA PRINCIPAL PARA USUARIOS AUTENTICADOS
    if (pathname === "/" && token) {
      const redirectUrl = token.role === "ADMIN" ? "/admin" : "/teacher"
      return NextResponse.redirect(new URL(redirectUrl, req.url))
    }

    // ⚡ PERMITIR SOLO LOGIN SIN TOKEN
    if (PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.next()
    }

    // ⚡ VERIFICACIÓN OBLIGATORIA DE TOKEN PARA TODAS LAS DEMÁS RUTAS
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ⚡ VERIFICACIÓN OBLIGATORIA DE ROLES VÁLIDOS (ADMIN o TEACHER)
    if (token.role !== "ADMIN" && token.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ⚡ VERIFICACIÓN OPTIMIZADA POR ROLES
    if (token.role === "ADMIN") {
      // Admin: bloquear solo teacher routes
      if (TEACHER_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL("/admin", req.url))
      }
    } 
    else if (token.role === "TEACHER") {
      // Teacher: verificar permisos permitidos
      const isAllowed = 
        PUBLIC_ROUTES.includes(pathname) ||
        SHARED_ROUTES.some(route => pathname.startsWith(route)) ||
        TEACHER_ROUTES.some(route => pathname.startsWith(route))

      if (!isAllowed) {
        return NextResponse.redirect(new URL("/teacher", req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // ⚡ OPTIMIZACIÓN: Lista rápida de rutas que SIEMPRE pasan sin token
        const alwaysAllowed = [
          "/api/auth",
          "/_next",
          "/favicon"
        ]

        if (alwaysAllowed.some(route => pathname.startsWith(route)) || pathname.includes(".")) {
          return true
        }

        // ⚡ RUTAS DE PAGO PÚBLICAS (sin autenticación)
        if (pathname.startsWith("/payment/") || 
            pathname.startsWith("/api/payment-form/") ||
            pathname.startsWith("/api/upload/payment-proof") ||
            pathname.startsWith("/api/recibo/") ||
            pathname.startsWith("/recibo/")) {
          return true
        }

        // ⚡ LOGIN: PERMITIR SIN TOKEN
        if (pathname === "/login") {
          return true
        }

        // ⚡ PÁGINA PRINCIPAL: REQUERIR TOKEN VÁLIDO PARA ACCESO
        if (pathname === "/") {
          return !!token
        }

        // ⚡ TODAS LAS DEMÁS RUTAS REQUIEREN TOKEN CON ROLES VÁLIDOS
        return !!token && (token.role === "ADMIN" || token.role === "TEACHER")
      },
    },
  }
)

// ⚡ CONFIGURACIÓN OPTIMIZADA - MATCHER MÁS ESPECÍFICO
export const config = {
  matcher: [
    /*
     * ⚡ OPTIMIZACIÓN: Matcher más específico para reducir overhead
     */
    "/((?!api/auth|api/recibo|api/payment-form|api/upload/payment-proof|_next/static|_next/image|favicon.ico|.*\\.|uploads/).*)",
  ]
} 