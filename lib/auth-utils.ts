import bcrypt from 'bcryptjs'

export type UserRole = 'ADMIN' | 'TEACHER'

export interface AuthUser {
  id: string
  email: string
  name: string
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