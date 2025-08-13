import { NextRequest, NextResponse } from 'next/server'
import { cloudinaryService } from '@/lib/cloudinary-service'

// POST /api/upload/product-image - Subir imagen de producto
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File | null

    if (!file) {
      return NextResponse.json(
        { message: 'No se encontró archivo de imagen' },
        { status: 400 }
      )
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Solo se permiten imágenes JPG o PNG' },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'La imagen no puede superar los 5MB' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const url = await cloudinaryService.uploadFile(buffer, {
      folder: 'product-images'
    })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error al subir imagen de producto:', error)
    return NextResponse.json(
      { message: 'Error interno del servidor al subir la imagen' },
      { status: 500 }
    )
  }
}


