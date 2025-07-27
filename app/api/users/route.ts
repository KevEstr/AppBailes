import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || ""

    const skip = (page - 1) * limit

    // Construir filtros de búsqueda
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ]
    }

    if (role) {
      where.role = role
    }

    // Obtener usuarios con paginación
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          trainer: true,
          student: true
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    const usersWithoutPassword = users.map(({ password, ...user }) => user)

    return NextResponse.json({
      success: true,
      users: usersWithoutPassword,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, password, role, trainerId } = await request.json()

    if (!email || !password  || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }

    // Verificar que si es TEACHER, se proporcione trainerId válido
    if (role === "TEACHER" && !trainerId) {
      return NextResponse.json({ error: "Teacher role requires trainerId" }, { status: 400 })
    }

    if (role === "TEACHER") {
      const trainer = await prisma.trainer.findUnique({
        where: { id: parseInt(trainerId) }
      })

      if (!trainer) {
        return NextResponse.json({ error: "Trainer not found" }, { status: 400 })
      }

      // Verificar que el trainer no tenga ya un usuario
      const existingUserWithTrainer = await prisma.user.findUnique({
        where: { trainerId: parseInt(trainerId) }
      })

      if (existingUserWithTrainer) {
        return NextResponse.json({ error: "Trainer already has a user account" }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        trainerId: role === "TEACHER" ? parseInt(trainerId) : null
      },
      include: {
        trainer: true
      }
    })

    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json({ success: true, user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
} 