import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

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
          // Limpiar el email para evitar problemas con espacios o caracteres invisibles
          const cleanEmail = credentials.email.trim()
          
          const user = await prisma.user.findUnique({
            where: {
              email: cleanEmail
            },
            include: {
              trainer: true
            }
          })

          if (!user) {
            return null
          }

          if (!user.isActive) {
            throw new Error("USER_INACTIVE")
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
            role: user.role,
            trainerName: user.trainer?.name
          }
        } catch (error) {
          console.error("Error during authentication:", error)
          if (error instanceof Error && error.message === "USER_INACTIVE") {
            throw error
          }
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
      if (token && session.user) {
        session.user.id = token.sub || ""
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

export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER'

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

export function requireRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = { USER: 0, MODERATOR: 1, ADMIN: 2 }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// Obtener usuario desde la sesión de NextAuth
export async function getUserFromRequest(request?: Request) {
  const { getServerSession } = await import('next-auth')
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }
  
  return {
    id: session.user.id || '',
    email: session.user.email || '',
    role: session.user.role as UserRole,
    name: session.user.name || session.user.email || ''
  }
} 