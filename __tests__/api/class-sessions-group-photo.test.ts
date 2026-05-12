/**
 * @jest-environment node
 *
 * Spec: mandatory-group-attendance-photo
 * Tarea 1: test exploratorio de la fault condition (Property 1)
 * Tarea 2.1 y 2.6: preservacion
 *
 * isBugCondition(input):
 *   action = PUT_SESSION_COMPLETED y ClassSession.photoUrl es null y la transicion es aceptada.
 *
 * Este test debe FALLAR en codigo sin fix (hoy el PUT acepta sin foto) y PASAR tras el fix.
 */

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

jest.mock('@/lib/prisma', () => {
	const classSession = {
		findUnique: jest.fn(),
		update: jest.fn(),
	}
	const trainerAttendance = {
		findFirst: jest.fn(),
		update: jest.fn(),
		create: jest.fn(),
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

import { PUT } from '@/app/api/class-sessions/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const getServerSessionMock = getServerSession as jest.Mock
const classSessionMock = (prisma as any).classSession

function buildPutRequest(id: number, body: Record<string, unknown>) {
	return {
		url: `http://localhost/api/class-sessions?id=${id}`,
		json: async () => body,
	} as any
}

describe('PUT /api/class-sessions - invariante foto grupal', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		getServerSessionMock.mockResolvedValue({
			user: { id: '1', role: 'TEACHER', name: 'Prof A' },
		})
	})

	test('Tarea 1 - rechaza COMPLETED cuando la sesion no tiene photoUrl (Property 1)', async () => {
		classSessionMock.findUnique.mockResolvedValue({
			id: 10,
			status: 'IN_PROGRESS',
			photoUrl: null,
		})
		classSessionMock.update.mockResolvedValue({ id: 10, status: 'IN_PROGRESS' })

		const res = await PUT(buildPutRequest(10, { status: 'COMPLETED' }))
		const json = await res.json()

		expect(res.status).toBe(409)
		expect(json.code).toBe('GROUP_PHOTO_REQUIRED')
		expect(classSessionMock.update).not.toHaveBeenCalled()
	})

	test('Tarea 2.1 - permite COMPLETED cuando la sesion ya tiene photoUrl (preservacion 3.1)', async () => {
		classSessionMock.findUnique.mockResolvedValue({
			id: 11,
			status: 'IN_PROGRESS',
			photoUrl: 'https://res.cloudinary.com/x/image/upload/foo.jpg',
		})
		classSessionMock.update.mockResolvedValue({
			id: 11,
			status: 'COMPLETED',
			danceClass: { trainer: { id: 1, name: 'T' } },
		})

		const res = await PUT(buildPutRequest(11, { status: 'COMPLETED' }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
		expect(classSessionMock.update).toHaveBeenCalledTimes(1)
	})

	test('Tarea 2.6 - no exige foto en transicion a CANCELLED (preservacion 3.7)', async () => {
		classSessionMock.findUnique.mockResolvedValue({
			id: 12,
			status: 'SCHEDULED',
			photoUrl: null,
		})
		classSessionMock.update.mockResolvedValue({
			id: 12,
			status: 'CANCELLED',
			danceClass: { trainer: { id: 1, name: 'T' } },
		})

		const res = await PUT(buildPutRequest(12, { status: 'CANCELLED' }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
	})

	test('Tarea 2.6 - no exige foto en noop de notas sobre sesion ya COMPLETED (preservacion 3.3)', async () => {
		classSessionMock.findUnique.mockResolvedValue({
			id: 13,
			status: 'COMPLETED',
			photoUrl: 'https://res.cloudinary.com/x/image/upload/bar.jpg',
		})
		classSessionMock.update.mockResolvedValue({
			id: 13,
			status: 'COMPLETED',
			danceClass: { trainer: { id: 1, name: 'T' } },
		})

		const res = await PUT(buildPutRequest(13, { notes: 'actualizado' }))
		expect(res.status).toBe(200)
	})

	test('Tarea 2.7 - rechaza rol no TEACHER/ADMIN con 403 (preservacion 3.8)', async () => {
		getServerSessionMock.mockResolvedValue({
			user: { id: '2', role: 'STUDENT' },
		})
		const res = await PUT(buildPutRequest(10, { status: 'COMPLETED' }))
		expect(res.status).toBe(403)
		expect(classSessionMock.findUnique).not.toHaveBeenCalled()
	})

	test('Tarea 2.7 - rechaza sin sesion autenticada con 401 (preservacion 3.8)', async () => {
		getServerSessionMock.mockResolvedValue(null)
		const res = await PUT(buildPutRequest(10, { status: 'COMPLETED' }))
		expect(res.status).toBe(401)
	})
})
