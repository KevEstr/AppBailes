import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const trainerId = session.user.trainerId
    if (!trainerId) {
      return NextResponse.json({ error: "Perfil de entrenador no encontrado" }, { status: 404 })
    }

    const trainer = await prisma.trainer.findUnique({
      where: { id: parseInt(trainerId) },
      select: {
        id: true,
        name: true,
        phone: true,
        birthDate: true,
        userId: true,
        user: { select: { email: true } },
      },
    })

    if (!trainer) {
      return NextResponse.json({ error: "Entrenador no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true, trainer })
  } catch (error) {
    console.error("Error fetching teacher profile:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "TEACHER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const trainerId = session.user.trainerId
    if (!trainerId) {
      return NextResponse.json({ error: "Perfil de entrenador no encontrado" }, { status: 404 })
    }

    const { name, phone, birthDate, email, password } = await request.json()
    const trainerIdNum = parseInt(trainerId)

    const updateData: any = {}
    let userUpdateData: any = {}

    if (name !== undefined) updateData.name = name.trim()
    if (phone !== undefined) {
      const cleanPhone = phone.replace(/[^0-9]/g, "")
      if (cleanPhone.length !== 10) {
        return NextResponse.json({ error: "El teléfono debe tener exactamente 10 dígitos" }, { status: 400 })
      }
      updateData.phone = `57${cleanPhone}`
    }
    if (birthDate !== undefined) {
      updateData.birthDate = birthDate || null
    }

    if (email !== undefined) {
      const cleanEmail = email.trim()
      if (!cleanEmail) {
        return NextResponse.json({ error: "El correo no puede estar vacío" }, { status: 400 })
      }
      userUpdateData.email = cleanEmail
    }

    if (password !== undefined && password.trim().length > 0) {
      if (password.trim().length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
      }
      userUpdateData.password = await bcrypt.hash(password.trim(), 12)
    }

    const hasTrainerChanges = Object.keys(updateData).length > 0
    const hasUserChanges = Object.keys(userUpdateData).length > 0

    if (!hasTrainerChanges && !hasUserChanges) {
      return NextResponse.json({ error: "No hay datos para actualizar" }, { status: 400 })
    }

    const updatedTrainer = await prisma.$transaction(async (tx) => {
      if (hasTrainerChanges) {
        await tx.trainer.update({
          where: { id: trainerIdNum },
          data: updateData,
        })
      }

      if (hasUserChanges) {
        const trainer = await tx.trainer.findUnique({
          where: { id: trainerIdNum },
          select: { userId: true },
        })
        if (trainer?.userId) {
          await tx.user.update({
            where: { id: trainer.userId },
            data: userUpdateData,
          })
        }
      }

      return tx.trainer.findUnique({
        where: { id: trainerIdNum },
        select: {
          id: true,
          name: true,
          phone: true,
          birthDate: true,
          userId: true,
          user: { select: { email: true } },
        },
      })
    })

    return NextResponse.json({ success: true, trainer: updatedTrainer })
  } catch (error) {
    console.error("Error updating teacher profile:", error)
    return NextResponse.json({ success: false, error: "Error interno del servidor" }, { status: 500 })
  }
}