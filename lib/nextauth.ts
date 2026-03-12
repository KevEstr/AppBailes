import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { logStep } from "@/lib/ops-logger"

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
          logStep({
            correlationId: "auth",
            scope: "auth.authorize",
            step: "missing_credentials",
            level: "warn",
          })
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

          const authUser = {
            id: user.id.toString(),
            email: user.email,
            name: user.email, // Usar email como name ya que no hay campo name
            role: user.role,
            trainerId: user.trainer?.id?.toString(),
            trainerName: user.trainer?.name
          }
          return authUser
        } catch (error) {
          logStep({
            correlationId: "auth",
            scope: "auth.authorize",
            step: "error",
            level: "error",
            data: {
              error:
                error instanceof Error
                  ? { name: error.name, message: error.message, stack: error.stack }
                  : error,
            },
          })
          if (error instanceof Error && error.message === "USER_INACTIVE") {
            throw error
          }
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.role = user.role
        token.trainerId = user.trainerId
        token.trainerName = user.trainerName
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string
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
    maxAge: 24 * 60 * 60, // 24 horas
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 horas
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
} 