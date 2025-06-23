import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    console.log("🔒 Middleware ejecutado:", { pathname, hasToken: !!token, role: token?.role })

    // Si ya está autenticado y está en login, redirigir según rol
    if (pathname === "/login" && token) {
      console.log("✅ Usuario autenticado en /login, redirigiendo según rol:", token.role)
      if (token.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", req.url))
      } else if (token.role === "TEACHER") {
        return NextResponse.redirect(new URL("/teacher", req.url))
      }
    }

    // Si no hay token, NextAuth manejará la redirección automáticamente
    if (!token) {
      console.log("❌ Sin token, NextAuth redirigirá a login")
      return NextResponse.next()
    }

    // ========== AUTORIZACIÓN POR ROLES ==========

    // Rutas exclusivas de ADMIN
    const adminOnlyRoutes = ["/admin", "/receipts", "/messages", "/debts", "/history"]
    // Rutas que puede acceder ADMIN y TEACHER
    const sharedRoutes = ["/classes", "/attendance"]
    // Rutas exclusivas de TEACHER
    const teacherOnlyRoutes = ["/teacher"]

    console.log("🔍 Verificando permisos:", { role: token.role, pathname })

    // Verificar permisos por rol
    if (token.role === "ADMIN") {
      // Admin puede acceder a todo excepto rutas específicas de teacher
      if (pathname.startsWith("/teacher")) {
        console.log("🚫 Admin intentando acceder a /teacher, redirigiendo a /admin")
        return NextResponse.redirect(new URL("/admin", req.url))
      }
      
      // Redirigir desde raíz al panel de admin
      if (pathname === "/") {
        console.log("🏠 Admin en raíz, redirigiendo a /admin")
        return NextResponse.redirect(new URL("/admin", req.url))
      }
    } 
    else if (token.role === "TEACHER") {
      // Teacher solo puede acceder a rutas compartidas y sus rutas específicas
      const canAccess = 
        sharedRoutes.some(route => pathname.startsWith(route)) ||
        teacherOnlyRoutes.some(route => pathname.startsWith(route))

      if (!canAccess) {
        console.log("🚫 Teacher sin permisos para:", pathname, "redirigiendo a /teacher")
        return NextResponse.redirect(new URL("/teacher", req.url))
      }

      // Redirigir desde raíz al panel de teacher
      if (pathname === "/") {
        console.log("🏠 Teacher en raíz, redirigiendo a /teacher")
        return NextResponse.redirect(new URL("/teacher", req.url))
      }
    }
    else {
      console.log("❌ Rol no reconocido:", token.role)
      return NextResponse.redirect(new URL("/login", req.url))
    }

    console.log("✅ Acceso permitido a:", pathname)
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Permitir acceso a rutas públicas y de autenticación
        if (pathname.startsWith("/api/auth") || 
            pathname.startsWith("/_next") || 
            pathname.startsWith("/favicon") ||
            pathname.includes(".")) {
          return true
        }

        // Permitir acceso a login sin token
        if (pathname === "/login") {
          return true
        }

        // Para páginas de pago públicas
        if (pathname.startsWith("/payment/")) {
          return true
        }

        // Todas las demás rutas requieren token
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth.js routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ]
} 