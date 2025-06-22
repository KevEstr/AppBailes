import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface User {
    role: string
    trainerId?: string
    trainerName?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: string
      trainerId?: string
      trainerName?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    trainerId?: string
    trainerName?: string
  }
} 