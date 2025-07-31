import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    const { email, password, role, isActive, name, phone } = await request.json()

    console.log("📝 Updating user:", { userId, email, role, isActive, name, phone })

    if (!email || !role) {
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

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        trainer: true
      }
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

    // Verificar que el teléfono no esté en uso por otro trainer (solo si es TEACHER y el teléfono cambió)
    if (role === "TEACHER" && existingUser.trainer) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const phoneWithCountryCode = `57${cleanPhone}`;
      
      // Solo verificar si el teléfono es diferente al actual
      if (existingUser.trainer.phone !== phoneWithCountryCode) {
        const existingTrainerWithPhone = await prisma.trainer.findUnique({
          where: { phone: phoneWithCountryCode }
        })

        if (existingTrainerWithPhone) {
          return NextResponse.json({ error: "Phone number already exists for another trainer" }, { status: 400 })
        }
      }
    }

    // Preparar datos para actualizar usuario
    const updateData: any = {
      email,
      role
    }

    // Actualizar isActive solo si se proporciona un valor
    if (isActive !== undefined) {
      updateData.isActive = isActive
      console.log("✅ isActive will be updated to:", isActive)
    } else {
      console.log("ℹ️ isActive not provided, keeping current value")
    }

    // Solo actualizar la contraseña si se proporciona una nueva
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 12)
    }

    // Actualizar en una transacción para mantener consistencia
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el usuario
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          trainer: true,
          student: true
        }
      });

      // Sincronizar el estado isActive con las tablas relacionadas
      if (isActive !== undefined) {
        // Si el usuario tiene relación con un estudiante, actualizar el estado del estudiante
        if (existingUser.student) {
          await tx.student.update({
            where: { userId: userId },
            data: { isActive: isActive }
          });
          console.log(`✅ Estado del estudiante ${existingUser.student.name} sincronizado a: ${isActive}`);
        }

        // Si el usuario tiene relación con un entrenador, actualizar el estado del entrenador
        if (existingUser.trainer) {
          await tx.trainer.update({
            where: { id: existingUser.trainer.id },
            data: { isActive: isActive }
          });
          console.log(`✅ Estado del entrenador ${existingUser.trainer.name} sincronizado a: ${isActive}`);
        }
      }

      // Actualizar el nombre en Student si el usuario tiene relación con un estudiante
      if (name && existingUser.student) {
        await tx.student.update({
          where: { userId: userId },
          data: { name: name.trim() }
        });
      }

      // Actualizar datos del trainer si el rol es TEACHER
      if (role === "TEACHER" && existingUser.trainer) {
        // Limpiar el teléfono y agregar el indicativo +57
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const phoneWithCountryCode = `57${cleanPhone}`;
        
        console.log("Actualizando trainer:", {
          trainerId: existingUser.trainer.id,
          userId: userId,
          name: name.trim(),
          phone: phoneWithCountryCode
        });
        
        await tx.trainer.update({
          where: { id: existingUser.trainer.id },
          data: {
            name: name.trim(),
            phone: phoneWithCountryCode
          }
        });

        // Obtener el usuario actualizado con la información del trainer
        const userWithTrainer = await tx.user.findUnique({
          where: { id: userId },
          include: {
            trainer: true,
            student: true
          }
        });

        return userWithTrainer;
      }

      return updatedUser;
    });

    const { password: _, ...userWithoutPassword } = result!;

    console.log("✅ User updated successfully:", { 
      id: userWithoutPassword.id, 
      email: userWithoutPassword.email, 
      isActive: userWithoutPassword.isActive 
    })

    return NextResponse.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })
    }

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: true,
        trainer: true
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // No permitir eliminar el usuario actual
    if (existingUser.id === parseInt(session.user.id)) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    // Implementar soft delete en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Marcar el usuario como inactivo
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { isActive: false }
      });

      // Si el usuario es un estudiante, marcar el estudiante como inactivo
      if (existingUser.student) {
        await tx.student.update({
          where: { userId: userId },
          data: { isActive: false }
        });
        console.log(`✅ Estudiante ${existingUser.student.name} marcado como inactivo`);
      }

      // Si el usuario es un entrenador, marcar el entrenador como inactivo
      if (existingUser.trainer) {
        await tx.trainer.update({
          where: { userId: userId },
          data: { isActive: false }
        });
        console.log(`✅ Entrenador ${existingUser.trainer.name} marcado como inactivo`);
      }

      return updatedUser;
    });

    return NextResponse.json({ 
      success: true, 
      message: "User and related records deactivated successfully",
      user: result
    })
  } catch (error) {
    console.error("Error soft deleting user:", error)
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 })
  }
}
