import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // Si no hay token y está intentando acceder a rutas protegidas
    if (!token && (pathname.startsWith("/admin") || pathname.startsWith("/teacher"))) {
      return NextResponse.redirect(new URL("/login", req.url))
    }

    // Si hay token, verificar permisos por rol
    if (token) {
      // Rutas de admin solo para ADMIN
      if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/login", req.url))
      }

      // Rutas de teacher solo para TEACHER
      if (pathname.startsWith("/teacher") && token.role !== "TEACHER") {
        return NextResponse.redirect(new URL("/login", req.url))
      }

      // Redirigir desde login si ya está autenticado
      if (pathname === "/login") {
        if (token.role === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", req.url))
        } else if (token.role === "TEACHER") {
          return NextResponse.redirect(new URL("/teacher", req.url))
        }
      }

      // Redirigir desde la página principal según el rol
      if (pathname === "/") {
        if (token.role === "ADMIN") {
          return NextResponse.redirect(new URL("/admin", req.url))
        } else if (token.role === "TEACHER") {
          return NextResponse.redirect(new URL("/teacher", req.url))
        }
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        // Permitir acceso a rutas públicas
        if (pathname === "/login" || pathname.startsWith("/api/auth")) {
          return true
        }

        // Requerir token para rutas protegidas
        if (pathname.startsWith("/admin") || pathname.startsWith("/teacher")) {
          return !!token
        }

        // Permitir acceso a otras rutas
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/",
    "/login",
    "/admin/:path*",
    "/teacher/:path*",
    "/api/users/:path*",
    "/api/teachers/:path*"
  ]
} 