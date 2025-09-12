import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { formatPhoneForDisplay } from "@/lib/phone-utils"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const activeParam = url.searchParams.get('active')
    
    // Si no se especifica active o es 'true', traer solo activos
    // Si se especifica 'false', traer solo inactivos
    // Si se especifica 'all', traer todos
    let whereClause: any = {}
    
    if (activeParam === 'false') {
      whereClause.isActive = false
    } else if (activeParam === 'all') {
      // No aplicar filtro, traer todos
    } else {
      // Por defecto, traer solo activos
      whereClause.isActive = true
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: { select: { email: true } },
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

    // Formatear números de teléfono para mostrar sin código de país
    const formattedStudents = students.map(student => ({
      ...student,
      phone: formatPhoneForDisplay(student.phone)
    }))

    return NextResponse.json({ success: true, students: formattedStudents })
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json({ error: "Error al obtener estudiantes" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()

    // Validar que la cédula sea válida (ahora es string)
    const cedula = data.id?.toString().trim();
    if (!cedula || cedula.length === 0) {
      return NextResponse.json({
        error: "La cédula es requerida"
      }, { status: 400 });
    }

    // Limpiar email antes de procesar
    const cleanEmail = data.email?.trim();
    if (!cleanEmail) {
      return NextResponse.json({
        error: "El email es requerido"
      }, { status: 400 });
    }

    // Verificar que no existe un estudiante con la misma cédula
    const existingStudentById = await prisma.student.findUnique({
      where: { id: cedula }
    });

    if (existingStudentById) {
      return NextResponse.json({
        error: "Ya existe un estudiante con esta cédula"
      }, { status: 400 });
    }

    // Encriptar la cédula para usarla como contraseña por defecto (12 salt rounds)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(cedula, 12);

    // Crear el estudiante y el usuario relacionado (email y password en tabla user)
    const student = await prisma.student.create({
      data: {
        id: cedula, // Usar la cédula como string
        name: data.name,
        phone: data.phone,
        avatar: data.avatar,
        user: {
          create: {
            email: cleanEmail,
            password: hashedPassword
          }
        }
      },
      include: {
        user: { select: { email: true } }
      }
    });

    return NextResponse.json({ success: true, student });
  } catch (error) {
    console.error("Error creating student:", error)
    return NextResponse.json({ error: "Error al crear estudiante" }, { status: 500 })
  }
}
