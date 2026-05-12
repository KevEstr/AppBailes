/**
 * @jest-environment node
 *
 * Spec: mandatory-group-attendance-photo
 * Tarea 2.5 / 4.1 / 4.2: upload de foto grupal.
 *
 * Preservacion: payload valido sigue almacenando en Cloudinary y retornando photoUrl.
 * Fix: ademas escribe ClassSession.photoUrl; responde 409 NO_SESSION_FOR_PHOTO si no hay sesion del dia.
 */

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

jest.mock('@/lib/cloudinary-service', () => ({
	cloudinaryService: { uploadFile: jest.fn() },
}))

jest.mock('@/lib/prisma', () => {
	const classSession = {
		findFirst: jest.fn(),
		update: jest.fn(),
	}
	const trainerAttendance = {
		findFirst: jest.fn(),
		update: jest.fn(),
		create: jest.fn(),
		findUnique: jest.fn(),
	}
	return {
		prisma: {
			classSession,
			trainerAttendance,
			$transaction: jest.fn(async (cb: any) => {
				if (typeof cb === 'function') {
					return cb({ classSession, trainerAttendance })
				}
				return Promise.all(cb)
			}),
		},
	}
})

import { POST } from '@/app/api/upload/attendance-photo/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { cloudinaryService } from '@/lib/cloudinary-service'

const getServerSessionMock = getServerSession as jest.Mock
const cloudinaryUpload = cloudinaryService.uploadFile as jest.Mock
const classSessionMock = (prisma as any).classSession
const trainerAttendanceMock = (prisma as any).trainerAttendance

function buildUploadRequest(fields: Record<string, string>, fileType = 'image/jpeg', fileSize = 1024) {
	const file = {
		name: 'photo.jpg',
		type: fileType,
		size: fileSize,
		arrayBuffer: async () => new ArrayBuffer(fileSize),
	}
	const entries = new Map<string, unknown>(Object.entries(fields))
	entries.set('photo', file)
	return {
		formData: async () => ({
			get: (key: string) => entries.get(key) ?? null,
		}),
	} as any
}

describe('POST /api/upload/attendance-photo - invariante de sesion', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		getServerSessionMock.mockResolvedValue({
			user: { id: '1', role: 'TEACHER', name: 'Prof A' },
		})
		cloudinaryUpload.mockResolvedValue('https://res.cloudinary.com/x/image/upload/ok.jpg')
	})

	test('Tarea 2.5 - payload valido retorna photoUrl y escribe ClassSession.photoUrl', async () => {
		classSessionMock.findFirst.mockResolvedValue({ id: 77, classId: 5 })
		trainerAttendanceMock.findFirst.mockResolvedValue(null)
		trainerAttendanceMock.create.mockResolvedValue({ id: 900 })
		classSessionMock.update.mockResolvedValue({ id: 77 })

		const res = await POST(buildUploadRequest({ classId: '5' }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
		expect(json.url).toMatch(/^https:\/\//)
		expect(classSessionMock.update).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 77 },
				data: expect.objectContaining({ photoUrl: json.url }),
			}),
		)
	})

	test('Tarea 4.2 - responde 409 NO_SESSION_FOR_PHOTO cuando no hay sesion del dia', async () => {
		classSessionMock.findFirst.mockResolvedValue(null)

		const res = await POST(buildUploadRequest({ classId: '5' }))
		const json = await res.json()

		expect(res.status).toBe(409)
		expect(json.code).toBe('NO_SESSION_FOR_PHOTO')
		expect(trainerAttendanceMock.create).not.toHaveBeenCalled()
		expect(trainerAttendanceMock.update).not.toHaveBeenCalled()
		expect(classSessionMock.update).not.toHaveBeenCalled()
	})

	test('rechaza formato no admitido con 400', async () => {
		const res = await POST(buildUploadRequest({ classId: '5' }, 'application/pdf'))
		expect(res.status).toBe(400)
	})

	test('rechaza rol no TEACHER/ADMIN con 403', async () => {
		getServerSessionMock.mockResolvedValue({ user: { id: '1', role: 'STUDENT' } })
		const res = await POST(buildUploadRequest({ classId: '5' }))
		expect(res.status).toBe(403)
	})

	test('preserva rama trainerAttendanceId existente (no toca ClassSession)', async () => {
		trainerAttendanceMock.findUnique.mockResolvedValue({ id: 42, classId: 5 })
		trainerAttendanceMock.update.mockResolvedValue({ id: 42 })

		const res = await POST(buildUploadRequest({ trainerAttendanceId: '42' }))
		expect(res.status).toBe(200)
		expect(classSessionMock.update).not.toHaveBeenCalled()
	})
})
