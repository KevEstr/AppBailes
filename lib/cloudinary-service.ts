import { v2 as cloudinary } from 'cloudinary';

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryService {
  /**
   * Sube un archivo a Cloudinary.
   * options.mimeType: MIME real del archivo (ej. image/heic, image/webp) para que Cloudinary lo decodifique correctamente.
   */
  async uploadFile(
    file: Buffer,
    options?: { folder?: string; mimeType?: string }
  ): Promise<string> {
    try {
      const base64File = file.toString('base64');
      const mime = options?.mimeType && options.mimeType.startsWith('image/')
        ? options.mimeType
        : 'image/jpeg';
      const dataURI = `data:${mime};base64,${base64File}`;

      // Subir a Cloudinary
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: options?.folder || 'payment-proofs',
        resource_type: 'auto',
        // Para fotos de perfil, aplicar transformaciones
        ...(options?.folder === 'profile-photos' && {
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        })
      });

      return result.secure_url;
    } catch (error) {
      console.error('Error al subir archivo a Cloudinary:', error);
      throw new Error('Error al subir archivo a Cloudinary');
    }
  }

  /**
   * Elimina un archivo de Cloudinary
   */
  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error al eliminar archivo de Cloudinary:', error);
      throw new Error('Error al eliminar archivo de Cloudinary');
    }
  }

  /**
   * Obtiene el public_id de una URL de Cloudinary
   */
  getPublicIdFromUrl(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  }
}

export const cloudinaryService = new CloudinaryService(); 