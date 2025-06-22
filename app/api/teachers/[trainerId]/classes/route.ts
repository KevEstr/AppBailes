import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/nextauth"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { trainerId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Solo permitir que los profesores vean sus propias clases o que los admins vean cualquier clase
    if (session.user.role === "TEACHER" && session.user.trainerId !== params.trainerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const trainerId = parseInt(params.trainerId)

    if (isNaN(trainerId)) {
      return NextResponse.json({ error: "Invalid trainer ID" }, { status: 400 })
    }

    const classes = await prisma.danceClass.findMany({
      where: {
        trainerId: trainerId,
        isActive: true
      },
      include: {
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        schedules: {
          where: {
            isActive: true
          },
          orderBy: [
            { dayOfWeek: "asc" },
            { startTime: "asc" }
          ]
        }
      },
      orderBy: {
        name: "asc"
      }
    })

    return NextResponse.json(classes)
  } catch (error) {
    console.error("Error fetching teacher classes:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
} 