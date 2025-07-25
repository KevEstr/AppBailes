import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// ⚡ CACHE DE RUTAS PARA EVITAR VERIFICACIONES REPETIDAS
const ADMIN_ROUTES = ["/admin", "/receipts", "/messages", "/debts", "/history"]
const SHARED_ROUTES = ["/classes", "/attendance"]
const TEACHER_ROUTES = ["/teacher"]
const STUDENT_ROUTES = ["/student"]
const PUBLIC_ROUTES = ["/login"]  // ⚡ REMOVIDO "/" de rutas públicas - ahora requiere autenticación
const PAYMENT_ROUTES = ["/payment/", "/recibo/"]  // ⚡ RUTAS PÚBLICAS DE PAGO Y RECIBOS

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

    // ⚡ PERMITIR RUTAS API - ESTAS MANEJAN SU PROPIA AUTENTICACIÓN
    if (pathname.startsWith("/api/")) {
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
      switch (token.role) {
        case "ADMIN":
          return NextResponse.redirect(new URL("/admin", req.url))
        case "TEACHER":
          return NextResponse.redirect(new URL("/teacher", req.url))
        case "STUDENT":
          return NextResponse.redirect(new URL("/student", req.url))
        default:
          return NextResponse.redirect(new URL("/login", req.url))
      }
    }

    // ⚡ REDIRECCIÓN DE PÁGINA PRINCIPAL PARA USUARIOS AUTENTICADOS
    if (pathname === "/" && token) {
      switch (token.role) {
        case "ADMIN":
          return NextResponse.redirect(new URL("/admin", req.url))
        case "TEACHER":
          return NextResponse.redirect(new URL("/teacher", req.url))
        case "STUDENT":
          return NextResponse.redirect(new URL("/student", req.url))
        default:
          return NextResponse.redirect(new URL("/login", req.url))
      }
    }

    // ⚡ PERMITIR SOLO LOGIN SIN TOKEN
    if (PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.next()
    }

    // ⚡ VERIFICACIÓN OBLIGATORIA DE TOKEN PARA TODAS LAS DEMÁS RUTAS
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ⚡ VERIFICACIÓN OBLIGATORIA DE ROLES VÁLIDOS (ADMIN, TEACHER o STUDENT)
    if (token.role !== "ADMIN" && token.role !== "TEACHER" && token.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // ⚡ VERIFICACIÓN OPTIMIZADA POR ROLES
    if (token.role === "ADMIN") {
      // Admin: bloquear solo teacher y student routes
      if (TEACHER_ROUTES.some(route => pathname.startsWith(route)) ||
          STUDENT_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL("/admin", req.url))
      }
    } 
    else if (token.role === "TEACHER") {
      // Teacher: verificar permisos permitidos (bloquear admin y student routes)
      const isAllowed = 
        PUBLIC_ROUTES.includes(pathname) ||
        SHARED_ROUTES.some(route => pathname.startsWith(route)) ||
        TEACHER_ROUTES.some(route => pathname.startsWith(route))

      if (!isAllowed) {
        return NextResponse.redirect(new URL("/teacher", req.url))
      }
    }
    else if (token.role === "STUDENT") {
      // Student: solo permitir rutas de estudiante y compartidas
      const isAllowed = 
        PUBLIC_ROUTES.includes(pathname) ||
        SHARED_ROUTES.some(route => pathname.startsWith(route)) ||
        STUDENT_ROUTES.some(route => pathname.startsWith(route))

      if (!isAllowed) {
        return NextResponse.redirect(new URL("/student", req.url))
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

        // ⚡ RUTAS DE PAGO Y RECIBOS PÚBLICAS (sin autenticación)
        if (PAYMENT_ROUTES.some(route => pathname.startsWith(route)) ||
            pathname.startsWith("/api/payment-form/") ||
            pathname.startsWith("/api/upload/") ||
            pathname.startsWith("/api/recibo/")) {
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
        return !!token && (token.role === "ADMIN" || token.role === "TEACHER" || token.role === "STUDENT")
      },
    },
  }
)

// ⚡ CONFIGURACIÓN OPTIMIZADA - MATCHER MÁS ESPECÍFICO
export const config = {
  matcher: [
    /*
     * ⚡ OPTIMIZACIÓN: Matcher más específico para reducir overhead
     * Excluye rutas públicas de pago, recibos y uploads
     */
    "/((?!api/auth|api/recibo|api/payment-form|api/upload|payment/|recibo/|_next/static|_next/image|favicon.ico|.*\\.|uploads/).*)",
  ]
} 