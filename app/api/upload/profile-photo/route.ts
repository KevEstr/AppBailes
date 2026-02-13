import { NextRequest, NextResponse } from 'next/server';
import { cloudinaryService } from '@/lib/cloudinary-service';

// POST /api/upload/profile-photo - Subir foto de perfil
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const studentId = formData.get('studentId') as string | null;

    if (!photo) {
      return NextResponse.json(
        { message: 'No se ha seleccionado ninguna foto' },
        { status: 400 }
      );
    }

    // Nota: studentId es opcional para permitir carga previa en el formulario de inscripción

    // Formatos habituales: iPhone (HEIC), Huawei/Android (JPEG, PNG, WebP)
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/x-heic'
    ];
    if (!allowedTypes.includes(photo.type)) {
      return NextResponse.json(
        { message: 'Formato no admitido. Usa JPG, PNG, WebP o HEIC.' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'La imagen no puede superar los 5MB' },
        { status: 400 }
      );
    }

    // Convertir archivo a buffer
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir a Cloudinary (pasamos el MIME para HEIC/WebP/etc.)
    const photoUrl = await cloudinaryService.uploadFile(buffer, {
      folder: 'profile-photos',
      mimeType: photo.type
    });

    return NextResponse.json({
      url: photoUrl,
      message: 'Foto subida exitosamente',
      studentId: studentId || undefined
    });

  } catch (error) {
    console.error('Error al subir foto de perfil:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor al subir la foto' },
      { status: 500 }
    );
  }
}
