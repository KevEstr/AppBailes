import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/class-sessions/[id]/photo-status
 *
 * Responde la verdad a nivel de sesion sobre la existencia de foto grupal.
 * Fuente autoritativa consumida por el frontend antes de completar asistencia
 * o finalizar modificacion. No filtra por userId.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: { id: string } },
) {
	try {
		const session = await getServerSession(authOptions)

		if (!session?.user) {
			return NextResponse.json(
				{ success: false, error: 'No autorizado' },
				{ status: 401 },
			)
		}

		if (session.user.role !== 'ADMIN' && session.user.role !== 'TEACHER') {
			return NextResponse.json(
				{ success: false, error: 'Sin permisos' },
				{ status: 403 },
			)
		}

		const sessionId = Number.parseInt(params.id)
		if (!sessionId || sessionId <= 0) {
			return NextResponse.json(
				{ success: false, error: 'ID de sesión inválido' },
				{ status: 400 },
			)
		}

		const classSession = await prisma.classSession.findUnique({
			where: { id: sessionId },
			select: { id: true, photoUrl: true },
		})

		if (!classSession) {
			return NextResponse.json(
				{ success: false, error: 'Sesión no encontrada' },
				{ status: 404 },
			)
		}

		return NextResponse.json({
			success: true,
			sessionId: classSession.id,
			hasPhoto: Boolean(classSession.photoUrl),
			photoUrl: classSession.photoUrl ?? null,
		})
	} catch (error) {
		console.error('Error obteniendo photo-status:', error)
		return NextResponse.json(
			{ success: false, error: 'Error interno del servidor' },
			{ status: 500 },
		)
	}
}
