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

    // Validar que la cédula sea un número válido
    const cedula = parseInt(data.id)
    if (!cedula || cedula <= 0) {
      return NextResponse.json({ 
        error: "La cédula debe ser un número válido" 
      }, { status: 400 })
    }

    // Verificar que no existe un estudiante con la misma cédula
    const existingStudentById = await prisma.student.findUnique({
      where: { id: cedula }
    })

    if (existingStudentById) {
      return NextResponse.json({ 
        error: "Ya existe un estudiante con esta cédula" 
      }, { status: 400 })
    }

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
        id: cedula, // Usar la cédula como ID
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
