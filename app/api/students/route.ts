import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const isActive = url.searchParams.get('active') !== 'false'

    const students = await prisma.student.findMany({
      where: {
        isActive,
      },
      include: {
        classEnrollments: {
          where: { isActive: true },
          include: {
            danceClass: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        attendances: {
          take: 5,
          orderBy: { date: 'desc' },
          include: {
            session: {
              include: {
                danceClass: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({ success: true, students })
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Verificar que no existe un estudiante con el mismo email o teléfono
    const existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone: data.phone }
        ]
      }
    })

    if (existingStudent) {
      return NextResponse.json({ 
        error: "Ya existe un estudiante con este email o teléfono" 
      }, { status: 400 })
    }

    const student = await prisma.student.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        avatar: data.avatar,
      },
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error("Error creating student:", error)
    return NextResponse.json({ error: "Error al crear estudiante" }, { status: 500 })
  }
}
