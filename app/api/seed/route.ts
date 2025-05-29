import { NextResponse } from "next/server"
import { seedDatabase } from "@/lib/seed"

export async function POST() {
  try {
    await seedDatabase()
    return NextResponse.json({
      success: true,
      message: "Base de datos inicializada correctamente",
    })
  } catch (error) {
    console.error("Error seeding database:", error)
    return NextResponse.json({ error: "Error al inicializar base de datos" }, { status: 500 })
  }
}
