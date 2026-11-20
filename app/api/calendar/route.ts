import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = searchParams.get("month")
    const search = searchParams.get("search")
    const profileType = searchParams.get("profileType")

    let monthStr = month
    if (!monthStr) {
      const now = new Date()
      monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    }
    const [yearStr, monthNumStr] = monthStr.split("-")
    const monthNum = parseInt(monthNumStr)
    const monthPad = String(monthNum).padStart(2, "0")

    const hasSearch = search && search.trim().length > 0

    const people: Array<{
      id: string
      name: string
      phone: string
      email: string | null
      birthDate: string | null
      type: "student" | "teacher"
      avatar: string | null
    }> = []

    const searchFilter = hasSearch
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : undefined

    const searchById = hasSearch && /^\d+$/.test(search) ? parseInt(search) : null

    function matchesMonthOrSearch(birthDate: string | null): boolean {
      if (!birthDate) return false
      if (birthDate.length < 7) return false
      if (hasSearch) return true
      const bdMonth = birthDate.substring(5, 7)
      return bdMonth === monthPad
    }

    if (!profileType || profileType === "student" || profileType === "all") {
      const studentWhere: any = {
        isActive: true,
        enrollmentData: { birthDate: { not: null as any } },
      }
      if (hasSearch) {
        const studentOr: any[] = [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
          { id: { contains: search } },
        ]
        studentWhere.OR = studentOr
      }

      const students = await prisma.student.findMany({
        where: studentWhere,
        select: {
          id: true,
          name: true,
          phone: true,
          avatar: true,
          enrollmentData: { select: { birthDate: true } },
          user: { select: { email: true } },
        },
      })

      for (const s of students) {
        if (!matchesMonthOrSearch(s.enrollmentData?.birthDate)) continue

        people.push({
          id: s.id,
          name: s.name,
          phone: s.phone,
          email: s.user?.email ?? null,
          birthDate: s.enrollmentData!.birthDate!,
          type: "student",
          avatar: s.avatar ?? null,
        })
      }
    }

    if (!profileType || profileType === "teacher" || profileType === "all") {
      const trainerWhere: any = {
        isActive: true,
        birthDate: { not: null as any },
      }
      if (hasSearch) {
        const trainerOr: any[] = [
          { name: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
        ]
        if (searchById !== null && searchById <= 2147483647) {
          trainerOr.push({ id: searchById })
        }
        trainerWhere.OR = trainerOr
      }

      const trainers = await prisma.trainer.findMany({
        where: trainerWhere,
        select: {
          id: true,
          name: true,
          phone: true,
          birthDate: true,
          user: { select: { email: true } },
        },
      })

      for (const t of trainers) {
        if (!matchesMonthOrSearch(t.birthDate)) continue

        people.push({
          id: String(t.id),
          name: t.name,
          phone: t.phone,
          email: t.user?.email ?? null,
          birthDate: t.birthDate!,
          type: "teacher",
          avatar: null,
        })
      }
    }

    if (hasSearch && (profileType === "all" || !profileType)) {
      const term = search.trim().toLowerCase()
      const filtered = people.filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(term)
        const phoneMatch = p.phone.includes(term)
        const emailMatch = (p.email ?? "").toLowerCase().includes(term)
        return nameMatch || phoneMatch || emailMatch
      })
      return NextResponse.json({ success: true, people: filtered })
    }

    return NextResponse.json({ success: true, people })
  } catch (error) {
    console.error("Calendar API error:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}