/**
 * @jest-environment node
 *
 * Spec: retirar-estudiante-soft-delete + reinscripcion-hereda-corte-y-transfiere
 *
 * Tests exhaustivos de la nueva implementacion en app/api/enrollments/route.ts:
 *   - DELETE (retirar)  -> soft-delete (isActive=false), NUNCA borrado fisico.
 *   - POST (inscribir)  -> herencia de paymentCutoffDay/monthlyFee desde la ultima
 *     inscripcion inactiva del mismo deporte + registro implicito de StudentTransfer.
 *
 * Cubre TODOS los caminos (validaciones tempranas, creacion, reactivacion, sin sesion,
 * distinto deporte, sin inscripcion previa, mismo clase, multi previas) y propiedades
 * property-based de la herencia de valores.
 */

import fc from 'fast-check'
import { POST as enrollPOST, DELETE as enrollDELETE } from '@/app/api/enrollments/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/nextauth', () => ({ authOptions: {} }))

jest.mock('@/lib/prisma', () => {
	const student = { findUnique: jest.fn() }
	const danceClass = { findUnique: jest.fn() }
	const classEnrollment = {
		findUnique: jest.fn(),
		findFirst: jest.fn(),
		create: jest.fn(),
		update: jest.fn(),
		delete: jest.fn(),
	}
	const studentTransfer = { create: jest.fn() }

	// $transaction ejecuta el callback con un tx que comparte los mismos mocks.
	const tx = {
		classEnrollment: { update: jest.fn(), findMany: jest.fn() },
		studentTransfer: { create: jest.fn(), createMany: jest.fn() },
	}

	const prisma: any = {
		student,
		danceClass,
		classEnrollment,
		studentTransfer,
		$transaction: jest.fn((fn) => fn(tx)),
	}
	prisma.__tx = tx

	return { prisma }
})

const getServerSessionMock = getServerSession as jest.Mock
const prismaMock = prisma as any

const STUDENT_ID = 'S1'
const CLASS_A = 32 // Carlos Davila
const CLASS_B = 61 // Antonia Contreras

function buildJsonRequest(body: Record<string, unknown>) {
	return {
		url: 'http://localhost/api/test',
		json: async () => body,
	} as any
}

/** Setup base exitoso: estudiante y clase existen, clase con capacidad. */
function setupValidBase(targetClassId: number, sport = 'VOLLEYBALL') {
	prismaMock.student.findUnique.mockResolvedValue({ id: STUDENT_ID, name: 'Valery' })
	prismaMock.danceClass.findUnique.mockResolvedValue({
		id: targetClassId,
		sport,
		capacity: 100,
		_count: { enrollments: 0 },
	})
}

beforeEach(() => {
	jest.clearAllMocks()
})

/* ============================================================================
 * DELETE /api/enrollments  (retirar estudiante)
 * ==========================================================================*/

describe('DELETE /api/enrollments - retirar estudiante (soft-delete)', () => {
	/** C1: id faltante -> 400 sin escrituras. */
	test('sin id: responde 400 y no toca la DB', async () => {
		const res = await enrollDELETE(buildJsonRequest({}))
		expect(res.status).toBe(400)
		expect(prismaMock.classEnrollment.update).not.toHaveBeenCalled()
		expect(prismaMock.classEnrollment.delete).not.toHaveBeenCalled()
	})

	/** C2: id valido -> desactiva (update isActive=false + deactivatedAt), registra baja, NUNCA delete fisico. */
	test('id valido: desactiva la inscripcion y registra la baja, no la borra fisicamente', async () => {
		prismaMock.classEnrollment.findUnique.mockResolvedValue({
			id: 123,
			studentId: STUDENT_ID,
			classId: CLASS_A,
		})

		const res = await enrollDELETE(buildJsonRequest({ id: 123 }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		// La escritura ocurre dentro de la transacción sobre el tx expuesto por el mock.
		const tx = prismaMock.__tx
		expect(tx.classEnrollment.update).toHaveBeenCalledTimes(1)
		expect(tx.classEnrollment.update).toHaveBeenCalledWith({
			where: { id: 123 },
			data: { isActive: false, deactivatedAt: expect.any(Date) },
		})

		expect(tx.studentTransfer.create).toHaveBeenCalledTimes(1)
		expect(tx.studentTransfer.create).toHaveBeenCalledWith({
			data: {
				studentId: STUDENT_ID,
				fromClassId: CLASS_A,
				toClassId: null,
				type: 'WITHDRAWAL',
				transferredBy: null,
				reason: 'Retiro manual de la clase',
			},
		})

		// Nunca se borra físicamente.
		expect(prismaMock.classEnrollment.delete).not.toHaveBeenCalled()
	})

	/** C3: inscripción no encontrada -> 404. */
	test('inscripcion no encontrada responde 404', async () => {
		prismaMock.classEnrollment.findUnique.mockResolvedValue(null)

		const res = await enrollDELETE(buildJsonRequest({ id: 123 }))
		expect(res.status).toBe(404)
	})

	/** C4: la transacción falla -> 500. */
	test('si la transaccion falla responde 500', async () => {
		prismaMock.classEnrollment.findUnique.mockResolvedValue({
			id: 123,
			studentId: STUDENT_ID,
			classId: CLASS_A,
		})
		prismaMock.$transaction.mockRejectedValue(new Error('db down'))

		const res = await enrollDELETE(buildJsonRequest({ id: 123 }))
		expect(res.status).toBe(500)
	})
})

/* ============================================================================
 * POST /api/enrollments - validaciones tempranas (sin escrituras)
 * ==========================================================================*/

describe('POST /api/enrollments - validaciones tempranas', () => {
	const earlyChecks = () => {
		expect(prismaMock.classEnrollment.create).not.toHaveBeenCalled()
		expect(prismaMock.classEnrollment.update).not.toHaveBeenCalled()
		expect(prismaMock.studentTransfer.create).not.toHaveBeenCalled()
	}

	/** C4: estudiante no encontrado -> 404. */
	test('estudiante no encontrado -> 404', async () => {
		prismaMock.student.findUnique.mockResolvedValue(null)

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(404)
		earlyChecks()
	})

	/** C5: clase no encontrada -> 404. */
	test('clase no encontrada -> 404', async () => {
		prismaMock.student.findUnique.mockResolvedValue({ id: STUDENT_ID })
		prismaMock.danceClass.findUnique.mockResolvedValue(null)

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(404)
		earlyChecks()
	})

	/** C6: capacidad excedida -> 400. */
	test('capacidad excedida -> 400', async () => {
		prismaMock.student.findUnique.mockResolvedValue({ id: STUDENT_ID })
		prismaMock.danceClass.findUnique.mockResolvedValue({
			id: CLASS_B,
			sport: 'VOLLEYBALL',
			capacity: 1,
			_count: { enrollments: 1 },
		})

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(400)
		earlyChecks()
	})

	/** C7: ya inscrito activo en la misma clase -> 400. */
	test('ya inscrito activo en la clase destino -> 400', async () => {
		setupValidBase(CLASS_B)
		prismaMock.classEnrollment.findUnique.mockResolvedValue({
			id: 999,
			isActive: true,
		})

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(400)
		earlyChecks()
	})
})

/* ============================================================================
 * POST /api/enrollments - creacion sin inscripcion previa inactiva
 * ==========================================================================*/

describe('POST /api/enrollments - creacion sin inscripcion previa', () => {
	/** C8: sin inscripcion previa -> crea nueva SIN heredar corte/tarifa y SIN transferencia. */
	test('sin inscripcion previa: crea nueva con defaults y NO registra transferencia', async () => {
		setupValidBase(CLASS_B)
		getServerSessionMock.mockResolvedValue({ user: { id: '261' } })

		prismaMock.classEnrollment.findUnique.mockResolvedValue(null) // no existe en destino
		prismaMock.classEnrollment.findFirst.mockResolvedValue(null) // sin previa inactiva

		let capturedCreate: any = null
		prismaMock.classEnrollment.create.mockImplementation(({ data }: any) => {
			capturedCreate = data
			return Promise.resolve({ id: 1, ...data })
		})

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		// Se crea con solo studentId + classId (sin claves de herencia).
		expect(capturedCreate).toEqual({ studentId: STUDENT_ID, classId: CLASS_B })
		expect(prismaMock.studentTransfer.create).not.toHaveBeenCalled()
	})

	/** C9: sin inscripcion previa y sin sesion -> igual sin transferencia (no falla). */
	test('sin inscripcion previa y sin sesion: crea igualmente y no registra transferencia', async () => {
		setupValidBase(CLASS_B)
		getServerSessionMock.mockResolvedValue(null)

		prismaMock.classEnrollment.findUnique.mockResolvedValue(null)
		prismaMock.classEnrollment.findFirst.mockResolvedValue(null)

		prismaMock.classEnrollment.create.mockResolvedValue({ id: 1, studentId: STUDENT_ID, classId: CLASS_B })

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)
		expect(prismaMock.studentTransfer.create).not.toHaveBeenCalled()
	})
})

/* ============================================================================
 * POST /api/enrollments - creacion CON inscripcion previa inactiva (herencia + transferencia)
 * ==========================================================================*/

describe('POST /api/enrollments - herencia desde inscripcion previa inactiva', () => {
	/** C10: hereda corte y tarifa + registra transferencia desde la clase previa. */
	test('hereda cutoff+tarifa y registra StudentTransfer(from previa -> destino)', async () => {
		setupValidBase(CLASS_B)
		getServerSessionMock.mockResolvedValue({ user: { id: '261' } })

		prismaMock.classEnrollment.findUnique.mockResolvedValue(null) // no existe en destino
		prismaMock.classEnrollment.findFirst.mockResolvedValue({
			id: 878,
			classId: CLASS_A,
			paymentCutoffDay: 15,
			monthlyFee: 75000,
		})

		let capturedCreate: any = null
		prismaMock.classEnrollment.create.mockImplementation(({ data }: any) => {
			capturedCreate = data
			return Promise.resolve({ id: 2, ...data })
		})
		prismaMock.studentTransfer.create.mockResolvedValue({ id: 999 })

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		expect(capturedCreate).toMatchObject({
			studentId: STUDENT_ID,
			classId: CLASS_B,
			paymentCutoffDay: 15,
			monthlyFee: 75000,
		})

		expect(prismaMock.studentTransfer.create).toHaveBeenCalledTimes(1)
		expect(prismaMock.studentTransfer.create).toHaveBeenCalledWith({
			data: {
				studentId: STUDENT_ID,
				fromClassId: CLASS_A,
				toClassId: CLASS_B,
				type: 'TRANSFER',
				transferredBy: 261,
				reason: 'Reinscripción: corte y tarifa heredados de la clase anterior',
			},
		})
	})

	/** C11: previa con cutoff null y fee null -> crea SIN esas claves pero IGUAL registra transferencia. */
	test('previa con cutoff/fee null: crea sin herencia pero registra transferencia', async () => {
		setupValidBase(CLASS_B)
		getServerSessionMock.mockResolvedValue({ user: { id: '261' } })

		prismaMock.classEnrollment.findUnique.mockResolvedValue(null)
		prismaMock.classEnrollment.findFirst.mockResolvedValue({
			id: 878,
			classId: CLASS_A,
			paymentCutoffDay: null,
			monthlyFee: null,
		})

		let capturedCreate: any = null
		prismaMock.classEnrollment.create.mockImplementation(({ data }: any) => {
			capturedCreate = data
			return Promise.resolve({ id: 2, ...data })
		})
		prismaMock.studentTransfer.create.mockResolvedValue({ id: 999 })

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(200)

		// Sin claves de herencia (caen al default del schema).
		expect(capturedCreate).toEqual({ studentId: STUDENT_ID, classId: CLASS_B })
		// La transferencia SI se registra (la cobertura por cadena no depende del cutoff).
		expect(prismaMock.studentTransfer.create).toHaveBeenCalledTimes(1)
	})

	/** C12: SIN sesion con previa inactiva -> hereda pero NO registra transferencia (warn). */
	test('sin sesion con previa inactiva: hereda corte/tarifa pero NO registra transferencia', async () => {
		setupValidBase(CLASS_B)
		getServerSessionMock.mockResolvedValue(null)

		prismaMock.classEnrollment.findUnique.mockResolvedValue(null)
		prismaMock.classEnrollment.findFirst.mockResolvedValue({
			id: 878,
			classId: CLASS_A,
			paymentCutoffDay: 15,
			monthlyFee: 75000,
		})

		let capturedCreate: any = null
		prismaMock.classEnrollment.create.mockImplementation(({ data }: any) => {
			capturedCreate = data
			return Promise.resolve({ id: 2, ...data })
		})

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(200)

		expect(capturedCreate).toMatchObject({
			paymentCutoffDay: 15,
			monthlyFee: 75000,
		})
		expect(prismaMock.studentTransfer.create).not.toHaveBeenCalled()
	})

	/** C13: previa inactiva de DISTINTO deporte -> no hereda, no transfiere. */
	test('previa de distinto deporte: no se selecciona -> sin herencia ni transferencia', async () => {
		setupValidBase(CLASS_B, 'VOLLEYBALL')
		getServerSessionMock.mockResolvedValue({ user: { id: '261' } })

		prismaMock.classEnrollment.findUnique.mockResolvedValue(null)
		// La previa es de DANCE, pero la destino es VOLLEYBALL: el filtro por sport la excluye.
		prismaMock.classEnrollment.findFirst.mockResolvedValue(null)

		let capturedCreate: any = null
		prismaMock.classEnrollment.create.mockImplementation(({ data }: any) => {
			capturedCreate = data
			return Promise.resolve({ id: 2, ...data })
		})

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(200)

		expect(capturedCreate).toEqual({ studentId: STUDENT_ID, classId: CLASS_B })
		expect(prismaMock.studentTransfer.create).not.toHaveBeenCalled()

		// Verificar que la consulta de previa filtro por deporte.
		expect(prismaMock.classEnrollment.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					studentId: STUDENT_ID,
					isActive: false,
					danceClass: { sport: 'VOLLEYBALL' },
				}),
			})
		)
	})

	/** C14: varias previas inactivas -> selecciona la MAS RECIENTE (updatedAt desc). */
	test('multiples previas: selecciona la mas reciente', async () => {
		setupValidBase(CLASS_B)
		getServerSessionMock.mockResolvedValue({ user: { id: '261' } })

		prismaMock.classEnrollment.findUnique.mockResolvedValue(null)

		const mostRecent = {
			id: 878,
			classId: CLASS_A,
			paymentCutoffDay: 15,
			monthlyFee: 75000,
		}
		prismaMock.classEnrollment.findFirst.mockImplementation(({ orderBy }: any) => {
			expect(orderBy).toEqual([{ updatedAt: 'desc' }, { id: 'desc' }])
			return Promise.resolve(mostRecent)
		})

		prismaMock.classEnrollment.create.mockResolvedValue({ id: 2 })
		prismaMock.studentTransfer.create.mockResolvedValue({ id: 999 })

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(200)

		expect(prismaMock.studentTransfer.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ fromClassId: CLASS_A, toClassId: CLASS_B }),
			})
		)
	})
})

/* ============================================================================
 * POST /api/enrollments - reactivacion (existingEnrollment inactivo en destino)
 * ==========================================================================*/

describe('POST /api/enrollments - reactivacion de inscripcion inactiva', () => {
	/** C15: reactiva existente heredando corte/tarifa de otra clase previa + transferencia. */
	test('reactiva existente inactivo heredando de la previa y registra transferencia', async () => {
		setupValidBase(CLASS_B)
		getServerSessionMock.mockResolvedValue({ user: { id: '261' } })

		// existingEnrollment inactivo EN el destino (CLASS_B).
		prismaMock.classEnrollment.findUnique.mockResolvedValue({
			id: 1650,
			isActive: false,
			paymentCutoffDay: 30,
		})
		// previa inactiva en OTRA clase (CLASS_A).
		prismaMock.classEnrollment.findFirst.mockResolvedValue({
			id: 878,
			classId: CLASS_A,
			paymentCutoffDay: 15,
			monthlyFee: 75000,
		})

		let capturedUpdate: any = null
		prismaMock.classEnrollment.update.mockImplementation(({ where, data }: any) => {
			capturedUpdate = { where, data }
			return Promise.resolve({ id: where.id, ...data })
		})
		prismaMock.studentTransfer.create.mockResolvedValue({ id: 999 })

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		const json = await res.json()

		expect(res.status).toBe(200)
		expect(json.success).toBe(true)

		expect(capturedUpdate.where).toEqual({ id: 1650 })
		expect(capturedUpdate.data).toMatchObject({
			isActive: true,
			paymentCutoffDay: 15,
			monthlyFee: 75000,
		})
		expect(prismaMock.classEnrollment.create).not.toHaveBeenCalled()
		expect(prismaMock.studentTransfer.create).toHaveBeenCalledTimes(1)
	})

	/** C16: re-inscribir en la MISMA clase (unica inactiva) -> reactiva sin herencia ni transferencia. */
	test('re-inscribir en la misma clase: reactiva sin herencia externa ni transferencia', async () => {
		setupValidBase(CLASS_B)
		getServerSessionMock.mockResolvedValue({ user: { id: '261' } })

		// existingEnrollment inactivo en destino; sin otra clase inactiva previa.
		prismaMock.classEnrollment.findUnique.mockResolvedValue({
			id: 1650,
			isActive: false,
			paymentCutoffDay: 15,
			monthlyFee: 75000,
		})
		prismaMock.classEnrollment.findFirst.mockResolvedValue(null)

		let capturedUpdate: any = null
		prismaMock.classEnrollment.update.mockImplementation(({ where, data }: any) => {
			capturedUpdate = { where, data }
			return Promise.resolve({ id: where.id, ...data })
		})

		const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
		expect(res.status).toBe(200)

		// Solo reactiva, sin pisar cutoff ni fee (conserva valores originales de la fila).
		expect(capturedUpdate.where).toEqual({ id: 1650 })
		expect(capturedUpdate.data).toMatchObject({ isActive: true })
		expect(capturedUpdate.data.paymentCutoffDay).toBeUndefined()
		expect(capturedUpdate.data.monthlyFee).toBeUndefined()
		expect(prismaMock.studentTransfer.create).not.toHaveBeenCalled()
	})
})

/* ============================================================================
 * POST /api/enrollments - propiedad: herencia de valores arbitrarios
 * ==========================================================================*/

describe('POST /api/enrollments - property-based herencia de cutoff y tarifa', () => {
	/** P1: cualquier cutoff 1..31 y cualquier tarifa positiva se hereda tal cual. */
	test('hereda cutoff (1..31) y monthlyFee arbitrarios al crear', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.integer({ min: 1, max: 31 }),
				fc.double({ min: 0.01, max: 1000000 }),
				async (cutoff, fee) => {
					jest.clearAllMocks()
					setupValidBase(CLASS_B)
					getServerSessionMock.mockResolvedValue({ user: { id: '261' } })

					prismaMock.classEnrollment.findUnique.mockResolvedValue(null)
					prismaMock.classEnrollment.findFirst.mockResolvedValue({
						id: 878,
						classId: CLASS_A,
						paymentCutoffDay: cutoff,
						monthlyFee: fee,
					})

					let capturedCreate: any = null
					prismaMock.classEnrollment.create.mockImplementation(({ data }: any) => {
						capturedCreate = data
						return Promise.resolve({ id: 2, ...data })
					})
					prismaMock.studentTransfer.create.mockResolvedValue({ id: 999 })

					const res = await enrollPOST(buildJsonRequest({ studentId: STUDENT_ID, classId: CLASS_B }))
					expect(res.status).toBe(200)

					expect(capturedCreate.paymentCutoffDay).toBe(cutoff)
					expect(capturedCreate.monthlyFee).toBe(fee)
					expect(prismaMock.studentTransfer.create).toHaveBeenCalledTimes(1)
				}
			),
			{ numRuns: 100 }
		)
	})
})
