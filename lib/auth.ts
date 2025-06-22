import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              trainer: true
            }
          })

          if (!user || !user.isActive) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            trainerId: user.trainerId?.toString(),
            trainerName: user.trainer?.name
          }
        } catch (error) {
          console.error("Error during authentication:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.trainerId = user.trainerId
        token.trainerName = user.trainerName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role as string
        session.user.trainerId = token.trainerId as string
        session.user.trainerName = token.trainerName as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'

export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER'

export interface JWTPayload {
  userId: string
  email: string
  role: UserRole
  name: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string | null
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generate JWT token
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

// Get user from request
export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : cookieToken

    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    // Verify session exists and is valid
    const session = await prisma.session.findFirst({
      where: {
        token,
        userId: payload.userId,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: true
      }
    })

    if (!session || !session.user.isActive) return null

    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      avatar: session.user.avatar
    }
  } catch {
    return null
  }
}

// Create session with proper user data
export async function createSession(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) throw new Error('User not found')

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role as UserRole,
    name: user.name
  })

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  })

  return token
}

// Delete session
export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { token }
  })
}

// Cleanup expired sessions
export async function cleanupExpiredSessions(): Promise<void> {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  })
}

// Role-based authorization
export function requireRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    USER: 0,
    MODERATOR: 1,
    ADMIN: 2
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
} 