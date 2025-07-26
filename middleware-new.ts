import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

// ⚡ RUTAS DE LA APLICACIÓN
const ADMIN_ROUTES = ["/admin", "/receipts", "/messages", "/debts", "/history"]
const SHARED_ROUTES = ["/classes", "/attendance"]
const TEACHER_ROUTES = ["/teacher"]
const STUDENT_ROUTES = ["/student"]
const PUBLIC_ROUTES = ["/login"]
const PAYMENT_ROUTES = ["/payment/", "/recibo/"]

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname, origin } = req.nextUrl

    // ⚡ SKIP MIDDLEWARE PARA RUTAS ESTÁTICAS Y API AUTH
    if (pathname.startsWith("/_next") || 
        pathname.startsWith("/api/auth") || 
        pathname.includes(".") ||
        pathname.startsWith("/api/")) {
      return NextResponse.next()
    }

    // ⚡ PERMITIR RUTAS DE PAGO Y RECIBOS PÚBLICAS
    if (PAYMENT_ROUTES.some(route => pathname.startsWith(route))) {
      return NextResponse.next()
    }

    // ⚡ Log solo en desarrollo y para casos específicos
    if (process.env.NODE_ENV === 'development') {
      console.log("🔒 Middleware:", { pathname, hasToken: !!token, role: token?.role })
    }

    // ⚡ REDIRECCIÓN DE LOGIN CON TOKEN VÁLIDO - evitar bucles
    if (pathname === "/login" && token?.role) {
      const roleRedirects = {
        ADMIN: "/admin",
        TEACHER: "/teacher", 
        STUDENT: "/student"
      }
      
      const redirectPath = roleRedirects[token.role as keyof typeof roleRedirects]
      if (redirectPath) {
        console.log("Redirecting authenticated user from login to:", redirectPath)
        return NextResponse.redirect(new URL(redirectPath, origin))
      }
    }

    // ⚡ REDIRECCIÓN DE PÁGINA PRINCIPAL PARA USUARIOS AUTENTICADOS
    if (pathname === "/" && token?.role) {
      const roleRedirects = {
        ADMIN: "/admin",
        TEACHER: "/teacher",
        STUDENT: "/student"
      }
      
      const redirectPath = roleRedirects[token.role as keyof typeof roleRedirects]
      if (redirectPath) {
        console.log("Redirecting user from root to:", redirectPath)
        return NextResponse.redirect(new URL(redirectPath, origin))
      }
    }

    // ⚡ REDIRECCIÓN AUTOMÁTICA DE PÁGINA PRINCIPAL AL LOGIN (SIN AUTENTICACIÓN)
    if (pathname === "/" && !token) {
      console.log("Redirecting unauthenticated user to login")
      return NextResponse.redirect(new URL("/login", origin))
    }

    // ⚡ PERMITIR RUTAS PÚBLICAS SIN TOKEN
    if (PUBLIC_ROUTES.includes(pathname)) {
      return NextResponse.next()
    }

    // ⚡ REQUERIR TOKEN PARA TODAS LAS DEMÁS RUTAS
    if (!token) {
      console.log("No token found, redirecting to login from:", pathname)
      return NextResponse.redirect(new URL("/login", origin))
    }

    // ⚡ VERIFICAR ROLES VÁLIDOS
    const validRoles = ["ADMIN", "TEACHER", "STUDENT"]
    if (!validRoles.includes(token.role as string)) {
      console.log("Invalid role:", token.role, "redirecting to login")
      return NextResponse.redirect(new URL("/login", origin))
    }

    // ⚡ VERIFICACIÓN POR ROLES - más permisiva para evitar bucles
    const userRole = token.role as string

    if (userRole === "ADMIN") {
      // Admin puede acceder a todo excepto rutas específicas de otros roles
      if (TEACHER_ROUTES.some(route => pathname.startsWith(route)) ||
          STUDENT_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.redirect(new URL("/admin", origin))
      }
    } 
    else if (userRole === "TEACHER") {
      // Teacher: permitir shared routes y teacher routes
      const isAllowedRoute = 
        SHARED_ROUTES.some(route => pathname.startsWith(route)) ||
        TEACHER_ROUTES.some(route => pathname.startsWith(route))

      if (!isAllowedRoute && !ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
        // Solo redirigir si está tratando de acceder a rutas no permitidas
        if (STUDENT_ROUTES.some(route => pathname.startsWith(route))) {
          return NextResponse.redirect(new URL("/teacher", origin))
        }
      }
    }
    else if (userRole === "STUDENT") {
      // Student: permitir shared routes y student routes
      const isAllowedRoute = 
        SHARED_ROUTES.some(route => pathname.startsWith(route)) ||
        STUDENT_ROUTES.some(route => pathname.startsWith(route))

      if (!isAllowedRoute) {
        // Solo redirigir si está tratando de acceder a rutas no permitidas
        if (ADMIN_ROUTES.some(route => pathname.startsWith(route)) ||
            TEACHER_ROUTES.some(route => pathname.startsWith(route))) {
          return NextResponse.redirect(new URL("/student", origin))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // ⚡ OPTIMIZACIÓN: Lista rápida de rutas que SIEMPRE pasan
        const alwaysAllowed = [
          "/api/auth",
          "/_next",
          "/favicon"
        ]

        if (alwaysAllowed.some(route => pathname.startsWith(route)) || pathname.includes(".")) {
          return true
        }

        // ⚡ RUTAS DE PAGO Y RECIBOS PÚBLICAS
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

        // ⚡ TODAS LAS DEMÁS RUTAS: verificar token
        return true // Dejar que el middleware principal maneje la lógica
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
