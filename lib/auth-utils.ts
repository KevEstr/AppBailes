import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export type UserRole = 'ADMIN' | 'TEACHER'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  trainerId?: string
  trainerName?: string
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Role-based authorization
export function requireRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    TEACHER: 0,
    ADMIN: 1
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// ========== NUEVAS FUNCIONES PARA AUTORIZACIÓN EN APIs ==========

/**
 * Función helper para verificar autenticación y autorización en APIs
 */
export async function verifyAuth(
  requiredRole?: UserRole | UserRole[]
): Promise<{ 
  success: boolean; 
  user?: AuthUser; 
  error?: NextResponse 
}> {
  try {
    const session = await getServerSession(authOptions)

    // Verificar si hay sesión
    if (!session || !session.user) {
      return {
        success: false,
        error: NextResponse.json(
          { message: 'No autorizado - Se requiere iniciar sesión' },
          { status: 401 }
        )
      }
    }

    const user = session.user as AuthUser

    // Verificar rol si se especifica
    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
      
      if (!roles.includes(user.role)) {
        return {
          success: false,
          error: NextResponse.json(
            { 
              message: `Acceso denegado - Se requiere rol: ${roles.join(' o ')}`,
              userRole: user.role,
              requiredRoles: roles
            },
            { status: 403 }
          )
        }
      }
    }

    return {
      success: true,
      user
    }
  } catch (error) {
    console.error('Error en verificación de autenticación:', error)
    return {
      success: false,
      error: NextResponse.json(
        { message: 'Error interno del servidor' },
        { status: 500 }
      )
    }
  }
}

/**
 * Wrapper para APIs que requieren autenticación
 */
export function withAuth(
  handler: (user: AuthUser, request: Request, ...args: any[]) => Promise<NextResponse>,
  requiredRole?: UserRole | UserRole[]
) {
  return async (request: Request, ...args: any[]) => {
    const auth = await verifyAuth(requiredRole)
    
    if (!auth.success) {
      return auth.error!
    }

    return handler(auth.user!, request, ...args)
  }
}

/**
 * Verificar si el usuario puede acceder a datos de un trainer específico
 */
export function canAccessTrainerData(user: AuthUser, trainerId: number): boolean {
  // Admin puede acceder a cualquier trainer
  if (user.role === 'ADMIN') {
    return true
  }

  // Teacher solo puede acceder a sus propios datos
  if (user.role === 'TEACHER' && user.trainerId) {
    return parseInt(user.trainerId) === trainerId
  }

  return false
}

/**
 * Verificar si el usuario puede acceder a funciones administrativas
 */
export function canAccessAdminFeatures(user: AuthUser): boolean {
  return user.role === 'ADMIN'
}

/**
 * Verificar si el usuario puede acceder a datos de estudiante específico
 */
export function canAccessStudentData(user: AuthUser, studentId?: number): boolean {
  // Admin siempre puede acceder
  if (user.role === 'ADMIN') {
    return true
  }

  // Teacher puede acceder si tiene estudiantes asignados (lógica a implementar según necesidades)
  if (user.role === 'TEACHER') {
    // Por ahora permitir acceso, se puede refinar después
    return true
  }

  return false
} 