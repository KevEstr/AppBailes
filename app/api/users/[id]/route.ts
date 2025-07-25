import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(params.id)
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        trainer: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { password, ...userWithoutPassword } = user

    return NextResponse.json({ success: true, user: userWithoutPassword })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(params.id)
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const { email, password, role, trainerId, isActive } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verificar si el email ya existe (solo si es diferente al actual)
    if (email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      })

      if (emailExists) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 })
      }
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

      // Verificar que el trainer no tenga ya un usuario (excepto el actual)
      const existingUserWithTrainer = await prisma.user.findFirst({
        where: { 
          trainerId: parseInt(trainerId),
          id: { not: userId }
        }
      })

      if (existingUserWithTrainer) {
        return NextResponse.json({ error: "Trainer already has a user account" }, { status: 400 })
      }
    }

    // Preparar datos para actualizar usuario
    const updateData: any = {
      email,
      role,
      trainerId: role === "TEACHER" ? parseInt(trainerId) : null,
      isActive: isActive !== undefined ? isActive : existingUser.isActive
    }

    // Solo actualizar la contraseña si se proporciona una nueva
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Actualizar el nombre en Student si el usuario es estudiante y tiene relación
    // Ya no se actualiza el nombre aquí, solo en Student directamente

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        trainer: true,
        student: true
      }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = parseInt(params.id)
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // No permitir eliminar el usuario actual
    if (existingUser.id === parseInt(session.user.id)) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
