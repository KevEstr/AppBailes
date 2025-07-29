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

    const { email, password, role, phone, name } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Para usuarios TEACHER, se requiere phone y name
    if (role === "TEACHER" && (!phone || !name)) {
      return NextResponse.json({ error: "Teacher role requires phone and name" }, { status: 400 })
    }

    // Validar formato del teléfono para TEACHER
    if (role === "TEACHER") {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length !== 10) {
        return NextResponse.json({ error: "Phone number must have exactly 10 digits" }, { status: 400 })
      }
    }

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Email already exists" }, { status: 400 })
    }

    // Verificar que el teléfono no esté en uso por otro trainer
    if (role === "TEACHER") {
      // Limpiar el teléfono y agregar el indicativo +57
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const phoneWithCountryCode = `57${cleanPhone}`;
      
      const existingTrainerWithPhone = await prisma.trainer.findUnique({
        where: { phone: phoneWithCountryCode }
      })

      if (existingTrainerWithPhone) {
        return NextResponse.json({ error: "Phone number already exists for another trainer" }, { status: 400 })
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // Crear usuario y trainer en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear el usuario
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          role,
        }
      })

      console.log("Usuario creado:", { id: newUser.id, email: newUser.email, role: newUser.role })

      // Si es TEACHER, crear el trainer automáticamente
      if (role === "TEACHER") {
        // Limpiar el teléfono y agregar el indicativo +57
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const phoneWithCountryCode = `57${cleanPhone}`;
        
        const newTrainer = await tx.trainer.create({
          data: {
            name,
            phone: phoneWithCountryCode,
            userId: newUser.id
          }
        })

        console.log("Trainer creado:", { 
          id: newTrainer.id, 
          name: newTrainer.name, 
          userId: newTrainer.userId,
          phone: newTrainer.phone 
        })

        // Obtener el usuario con la información del trainer
        const userWithTrainer = await tx.user.findUnique({
          where: { id: newUser.id },
          include: {
            trainer: true
          }
        })

        console.log("Usuario con trainer:", userWithTrainer)

        return userWithTrainer
      }

      return newUser
    })

    const { password: _, ...userWithoutPassword } = result!

    return NextResponse.json({ success: true, user: userWithoutPassword }, { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
} 