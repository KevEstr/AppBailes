import { NextRequest, NextResponse } from 'next/server';
import { cloudinaryService } from '@/lib/cloudinary-service';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('proof') as unknown as File;

    if (!file) {
      return NextResponse.json(
        { message: 'No se encontró archivo' },
        { status: 400 }
      );
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Tipo de archivo no permitido. Solo JPG, PNG y PDF.' },
        { status: 400 }
      );
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'El archivo es demasiado grande. Máximo 5MB.' },
        { status: 400 }
      );
    }

    // Convertir archivo a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Subir a Cloudinary
    const fileUrl = await cloudinaryService.uploadFile(buffer, {
      folder: 'payment-proofs'
    });

    // Retornar URL del archivo
    return NextResponse.json({ url: fileUrl }, { status: 200 });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    return NextResponse.json(
      { message: 'Error al procesar el archivo' },
      { status: 500 }
    );
  }
} 