import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const students = await prisma.student.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({ students })
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const student = await prisma.student.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        group: data.group,
        avatar: data.avatar,
      },
    })

    return NextResponse.json({ student })
  } catch (error) {
    console.error("Error creating student:", error)
    return NextResponse.json({ error: "Error al crear estudiante" }, { status: 500 })
  }
}
