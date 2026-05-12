import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cloudinaryService } from '@/lib/cloudinary-service'

const ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
	'image/x-heic',
	'image/gif',
	'image/bmp',
	'image/tiff',
])

const MAX_SIZE = 5 * 1024 * 1024

function dayRange(now: Date) {
	const startOfDay = new Date(now)
	startOfDay.setHours(0, 0, 0, 0)
	const endOfDay = new Date(now)
	endOfDay.setHours(23, 59, 59, 999)
	return { startOfDay, endOfDay }
}

export async function POST(request: NextRequest) {
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
				{ success: false, error: 'No tienes permisos para subir fotos de asistencia' },
				{ status: 403 },
			)
		}

		const formData = await request.formData()
		const photo = formData.get('photo') as File
		const trainerAttendanceId = formData.get('trainerAttendanceId') as string
		const matchTrainerAttendanceId = formData.get('matchTrainerAttendanceId') as string
		const classId = formData.get('classId') as string

		if (!photo) {
			return NextResponse.json(
				{ success: false, error: 'No se ha seleccionado ninguna foto' },
				{ status: 400 },
			)
		}

		if (!trainerAttendanceId && !matchTrainerAttendanceId && !classId) {
			return NextResponse.json(
				{ success: false, error: 'Se requiere trainerAttendanceId, matchTrainerAttendanceId o classId' },
				{ status: 400 },
			)
		}

		if (!ALLOWED_TYPES.has(photo.type)) {
			return NextResponse.json(
				{ success: false, error: 'Formato no admitido. Usa JPG, PNG, WebP, GIF, BMP, TIFF o HEIC.' },
				{ status: 400 },
			)
		}

		if (photo.size > MAX_SIZE) {
			return NextResponse.json(
				{ success: false, error: 'La imagen no puede superar los 5MB' },
				{ status: 400 },
			)
		}

		if (classId) {
			const userId = Number.parseInt(session.user.id)
			const parsedClassId = Number.parseInt(classId)
			const now = new Date()
			const { startOfDay, endOfDay } = dayRange(now)

			const classSession = await prisma.classSession.findFirst({
				where: {
					classId: parsedClassId,
					OR: [
						{ date: { gte: startOfDay, lte: endOfDay } },
						{ startTime: { gte: startOfDay, lte: endOfDay } },
					],
				},
				orderBy: { startTime: 'desc' },
				select: { id: true },
			})

			if (!classSession) {
				return NextResponse.json(
					{
						success: false,
						code: 'NO_SESSION_FOR_PHOTO',
						error: 'No existe una sesión para esta clase en el día actual',
					},
					{ status: 409 },
				)
			}

			const bytes = await photo.arrayBuffer()
			const buffer = Buffer.from(bytes)
			const photoUrl = await cloudinaryService.uploadFile(buffer, {
				folder: 'attendance-photos',
				mimeType: photo.type,
			})

			const result = await prisma.$transaction(async (tx) => {
				const existing = await tx.trainerAttendance.findFirst({
					where: {
						userId,
						classId: parsedClassId,
						date: { gte: startOfDay, lte: endOfDay },
					},
				})

				const attendance = existing
					? await tx.trainerAttendance.update({
						where: { id: existing.id },
						data: { photoUrl },
					})
					: await tx.trainerAttendance.create({
						data: {
							userId,
							classId: parsedClassId,
							status: 'PRESENT',
							photoUrl,
							date: now,
							notes: 'Asistencia registrada al subir foto grupal',
						},
					})

				await tx.classSession.update({
					where: { id: classSession.id },
					data: {
						photoUrl,
						photoUploadedAt: now,
						photoUploadedById: userId,
					},
				})

				return attendance
			})

			return NextResponse.json({
				success: true,
				url: photoUrl,
				trainerAttendanceId: result.id,
				sessionId: classSession.id,
				message: 'Foto de asistencia subida exitosamente',
			})
		}

		const bytes = await photo.arrayBuffer()
		const buffer = Buffer.from(bytes)
		const photoUrl = await cloudinaryService.uploadFile(buffer, {
			folder: 'attendance-photos',
			mimeType: photo.type,
		})

		if (trainerAttendanceId) {
			const parsedAttId = Number.parseInt(trainerAttendanceId)
			const attendance = await prisma.trainerAttendance.findUnique({
				where: { id: parsedAttId },
			})

			if (!attendance) {
				return NextResponse.json(
					{ success: false, error: 'Registro de asistencia no encontrado' },
					{ status: 404 },
				)
			}

			await prisma.trainerAttendance.update({
				where: { id: parsedAttId },
				data: { photoUrl },
			})

			return NextResponse.json({
				success: true,
				url: photoUrl,
				trainerAttendanceId: parsedAttId,
				message: 'Foto de asistencia subida exitosamente',
			})
		}

		const parsedId = Number.parseInt(matchTrainerAttendanceId)
		await (prisma as any).matchTrainerAttendance.update({
			where: { id: parsedId },
			data: { photoUrl },
		})

		return NextResponse.json({
			success: true,
			url: photoUrl,
			matchTrainerAttendanceId: parsedId,
			message: 'Foto de asistencia de evento subida exitosamente',
		})
	} catch (error) {
		console.error('Error al subir foto de asistencia:', error)
		return NextResponse.json(
			{ success: false, error: 'Error interno del servidor al subir la foto' },
			{ status: 500 },
		)
	}
}
