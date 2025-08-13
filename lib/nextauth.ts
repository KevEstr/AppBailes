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
          console.log("❌ Missing credentials")
          return null
        }

        try {
          console.log("🔍 Attempting to authenticate:", credentials.email)
          
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email
            },
            include: {
              trainers: true
            }
          })

          if (!user) {
            console.log("❌ User not found:", credentials.email)
            return null
          }

          if (!user.isActive) {
            console.log("❌ User not active:", credentials.email)
            throw new Error("USER_INACTIVE")
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.log("❌ Invalid password for:", credentials.email)
            return null
          }

          console.log("✅ User authenticated successfully:", user.email, "Role:", user.role)
          
          const authUser = {
            id: user.id.toString(),
            email: user.email,
            name: user.email, // Usar email como name ya que no hay campo name
            role: user.role,
            trainerId: user.trainerId?.toString(),
            trainerName: user.trainers?.name
          }
          
          console.log("✅ Returning auth user:", authUser)
          return authUser
        } catch (error) {
          console.error("❌ Error during authentication:", error)
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
      // Log para debugging
      console.log("🔐 JWT Callback:", { 
        hasUser: !!user, 
        hasToken: !!token, 
        trigger,
        tokenRole: token?.role,
        userRole: user?.role 
      })
      
      if (user) {
        console.log("📝 Setting token data from user:", user)
        token.role = user.role
        token.trainerId = user.trainerId
        token.trainerName = user.trainerName
      }
      
      console.log("📤 JWT token result:", { 
        sub: token.sub, 
        role: token.role, 
        trainerId: token.trainerId 
      })
      
      return token
    },
    async session({ session, token }) {
      console.log("👤 Session Callback:", { 
        hasSession: !!session, 
        hasToken: !!token,
        tokenSub: token?.sub,
        tokenRole: token?.role 
      })
      
      if (token) {
        session.user.id = token.sub as string
        session.user.role = token.role as string
        session.user.trainerId = token.trainerId as string
        session.user.trainerName = token.trainerName as string
        
        console.log("📤 Session result:", {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role
        })
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
  debug: process.env.NODE_ENV === 'development',
  // Agregar eventos para debugging
  events: {
    async signIn(message) {
      console.log("🎉 SignIn Event:", message.user?.email, message.user?.role)
    },
    async signOut(message) {
      console.log("👋 SignOut Event:", message.token?.email)
    },
    async session(message) {
      console.log("📱 Session Event:", message.session?.user?.email)
    }
  }
} 