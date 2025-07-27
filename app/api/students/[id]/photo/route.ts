import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// PUT /api/students/[id]/photo - Actualizar foto de perfil del estudiante
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { photoUrl } = body;

    if (!photoUrl) {
      return NextResponse.json(
        { message: 'URL de la foto es requerida' },
        { status: 400 }
      );
    }

    // Verificar que el estudiante existe
    const student = await prisma.student.findUnique({
      where: { id: id }
    });

    if (!student) {
      return NextResponse.json(
        { message: 'Estudiante no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar la foto del estudiante
    const updatedStudent = await prisma.student.update({
      where: { id: id },
      data: {
        avatar: photoUrl
      },
      select: {
        id: true,
        name: true,
        avatar: true
      }
    });

    return NextResponse.json({
      success: true,
      student: updatedStudent,
      message: 'Foto de perfil actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar foto de perfil:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
