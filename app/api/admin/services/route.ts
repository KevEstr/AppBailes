import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/services - Obtener todos los servicios
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const services = await prisma.service.findMany({
      include: {
        serviceRates: {
          where: { validUntil: null },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            serviceOrders: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/admin/services - Crear nuevo servicio
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const { name, description, basePrice, category, rates } = data;

    // Validaciones
    if (!name || !basePrice || !category) {
      return NextResponse.json(
        { message: 'Nombre, precio base y categoría son requeridos' },
        { status: 400 }
      );
    }

    // Crear servicio con tarifas
    const service = await prisma.service.create({
      data: {
        name,
        description,
        basePrice: parseFloat(basePrice),
        category,
        serviceRates: {
          create: rates?.length > 0 ? rates.map((rate: any) => ({
            level: rate.level || null,
            sportType: rate.sportType || null,
            price: parseFloat(rate.price),
            isDefault: rate.isDefault || false
          })) : [{
            price: parseFloat(basePrice),
            isDefault: true
          }]
        }
      },
      include: {
        serviceRates: true
      }
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Error creating service:', error);
    return NextResponse.json(
      { message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 