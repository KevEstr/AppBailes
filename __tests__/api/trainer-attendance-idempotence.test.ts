/**
 * @jest-environment node
 *
 * Spec: mandatory-group-attendance-photo
 * Tarea 2.8: idempotencia de POST /api/trainer-attendance por (userId, classId, dia).
 * Verifica que dos POSTs consecutivos NO crean un segundo registro.
 */

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))

jest.mock('@/lib/prisma', () => {
	const trainerAttendance = {
		findFirst: jest.fn(),
		update: jest.fn(),
		create: jest.fn(),
	}
	const danceClass = {
		findUnique: jest.fn(),
	}
	return {
		prisma: { trainerAttendance, danceClass },
	}
})

import { POST } from '@/app/api/trainer-attendance/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const getServerSessionMock = getServerSession as jest.Mock
const trainerAttendanceMock = (prisma as any).trainerAttendance
const danceClassMock = (prisma as any).danceClass

function buildPostRequest(body: Record<string, unknown>) {
	return { json: async () => body } as any
}

describe('POST /api/trainer-attendance - idempotencia', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		getServerSessionMock.mockResolvedValue({
			user: { id: '1', role: 'TEACHER', name: 'Prof A', email: 'a@x.co' },
		})
		danceClassMock.findUnique.mockResolvedValue({
			id: 5,
			name: 'Clase X',
			trainer: { id: 1, name: 'Prof A' },
		})
	})

	test('actualiza el registro existente y no crea uno nuevo (preservacion 3.9)', async () => {
		trainerAttendanceMock.findFirst.mockResolvedValue({
			id: 99,
			userId: 1,
			classId: 5,
			status: 'PRESENT',
		})
		trainerAttendanceMock.update.mockResolvedValue({
			id: 99,
			userId: 1,
			classId: 5,
			status: 'PRESENT',
			user: { id: 1, email: 'a@x.co', role: 'TEACHER' },
			class: { id: 5, name: 'Clase X', trainer: { id: 1, name: 'Prof A' } },
		})

		const res = await POST(buildPostRequest({ classId: 5, status: 'PRESENT' }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
		expect(trainerAttendanceMock.update).toHaveBeenCalledTimes(1)
		expect(trainerAttendanceMock.create).not.toHaveBeenCalled()
	})

	test('crea nuevo registro si no existe uno para el dia', async () => {
		trainerAttendanceMock.findFirst.mockResolvedValue(null)
		trainerAttendanceMock.create.mockResolvedValue({
			id: 100,
			userId: 1,
			classId: 5,
			status: 'PRESENT',
			user: { id: 1, email: 'a@x.co', role: 'TEACHER' },
			class: { id: 5, name: 'Clase X', trainer: { id: 1, name: 'Prof A' } },
		})

		const res = await POST(buildPostRequest({ classId: 5, status: 'PRESENT' }))
		expect(res.status).toBe(200)
		expect(trainerAttendanceMock.create).toHaveBeenCalledTimes(1)
		expect(trainerAttendanceMock.update).not.toHaveBeenCalled()
	})
})
