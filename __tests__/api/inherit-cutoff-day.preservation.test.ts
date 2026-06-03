/**
 * @jest-environment node
 *
 * Spec: inherit-cutoff-day-on-transfer
 * Tarea 2: Tests de preservacion property-based (ANTES del fix, observation-first).
 *
 * Property 2: Preservation - Comportamiento no-bug inalterado.
 * Validates: Requirements 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * Metodologia observation-first: se ejecuta el codigo SIN fix sobre inputs `¬C(X)`
 * (fuera de la Bug Condition), se observa la salida real y se aserta esa salida.
 * Estas propiedades capturan la baseline correcta que el fix NO debe romper.
 *
 * RESULTADO ESPERADO: TODOS los tests PASAN sobre el codigo SIN fix (baseline).
 * Tras aplicar el fix (Tareas 3-6) estos MISMOS tests deben seguir pasando (Tarea 7.2).
 *
 * Propiedades implementadas en este archivo (subset testeable sin DB real ni deps extra):
 *   - P-Pres-5 (transferencia fallida -> sin escrituras tx)      -> bugfix clausula 3.7
 *   - P-Pres-6 (cutoff 30 explicito en origen -> destino 30)     -> bugfix clausula 3.5 / Invariante I1 (2.4)
 *   - P-Pres-2 (edicion manual update-payment-config)            -> bugfix clausula 3.2
 *   - P-Pres-4 (degradacion a 30 sin enrollment / baseline)      -> bugfix clausulas 2.7, 3.6
 */

import fc from 'fast-check'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/nextauth', () => ({ authOptions: {} }))

jest.mock('@/lib/prisma', () => {
	const student = { findUnique: jest.fn() }
	const danceClass = { findUnique: jest.fn() }
	// classEnrollment.update lo usa update-payment-config (NO la transferencia, que escribe via tx).
	const classEnrollment = { findUnique: jest.fn(), update: jest.fn() }
	const paymentPeriod = { findFirst: jest.fn() }

	// Mocks a nivel de transaccion (tx.*). Se exponen via __tx para configurarlos/leerlos.
	const txClassEnrollment = { update: jest.fn(), create: jest.fn() }
	const txStudentTransfer = { create: jest.fn() }
	const txMonthlyPayment = { findFirst: jest.fn(), deleteMany: jest.fn() }

	return {
		prisma: {
			student,
			danceClass,
			classEnrollment,
			paymentPeriod,
			$transaction: jest.fn(async (cb: any) =>
				cb({
					classEnrollment: txClassEnrollment,
					studentTransfer: txStudentTransfer,
					monthlyPayment: txMonthlyPayment,
				})
			),
			__tx: {
				classEnrollment: txClassEnrollment,
				studentTransfer: txStudentTransfer,
				monthlyPayment: txMonthlyPayment,
			},
		},
	}
})

import { POST as transferPOST } from '@/app/api/enrollments/transfer/route'
import { PUT as updateConfigPUT } from '@/app/api/enrollments/update-payment-config/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

const getServerSessionMock = getServerSession as jest.Mock
const prismaMock = prisma as any
const tx = (prisma as any).__tx

const FROM_CLASS_ID = 1
const TO_CLASS_ID = 2

function buildJsonRequest(body: Record<string, unknown>) {
	return {
		url: 'http://localhost/api/test',
		json: async () => body,
	} as any
}

/* ============================================================================
 * P-Pres-5 (transferencia fallida) -> bugfix clausula 3.7
 *   "WHEN una transferencia falla [...] THEN el sistema SHALL CONTINUE TO dejar
 *    tanto el origen como el destino con sus valores previos, sin efectos colaterales."
 *
 * Cuando la transferencia falla ANTES de la `prisma.$transaction` (estudiante no
 * encontrado -> 404, clase inexistente -> 404, distinto deporte -> 400, no inscrito
 * en origen -> 400, capacidad excedida -> 400, ya inscrito en destino -> 400),
 * NO debe ocurrir ninguna escritura tx (update/create) y el status debe ser el esperado.
 *
 * MUST PASS sobre codigo sin fix: el fix solo toca el valor heredado dentro de la
 * transaccion, nunca el camino de validacion previo.
 * ==========================================================================*/

type FailureScenario =
	| 'student-not-found'
	| 'class-not-found'
	| 'different-sport'
	| 'not-enrolled-origin'
	| 'capacity-exceeded'
	| 'already-enrolled-dest'

const EXPECTED_STATUS: Record<FailureScenario, number> = {
	'student-not-found': 404,
	'class-not-found': 404,
	'different-sport': 400,
	'not-enrolled-origin': 400,
	'capacity-exceeded': 400,
	'already-enrolled-dest': 400,
}

function setupFailureScenario(scenario: FailureScenario) {
	getServerSessionMock.mockResolvedValue({ user: { id: '1' } })

	prismaMock.student.findUnique.mockResolvedValue(
		scenario === 'student-not-found' ? null : { id: 'S1', name: 'Test Student' }
	)

	prismaMock.danceClass.findUnique.mockImplementation(({ where }: any) => {
		const id = where.id
		if (scenario === 'class-not-found' && id === TO_CLASS_ID) {
			return Promise.resolve(null)
		}
		const sport = scenario === 'different-sport' && id === TO_CLASS_ID ? 'VOLLEYBALL' : 'BAILE'
		const enrollmentsCount = scenario === 'capacity-exceeded' && id === TO_CLASS_ID ? 100 : 0
		return Promise.resolve({
			id,
			sport,
			capacity: 100,
			_count: { enrollments: enrollmentsCount },
		})
	})

	prismaMock.classEnrollment.findUnique.mockImplementation(({ where }: any) => {
		const classId = where.studentId_classId.classId
		if (classId === FROM_CLASS_ID) {
			if (scenario === 'not-enrolled-origin') return Promise.resolve(null)
			return Promise.resolve({
				id: 'origin-enrollment',
				isActive: true,
				paymentCutoffDay: 15,
				monthlyFee: null,
			})
		}
		// Destino
		if (scenario === 'already-enrolled-dest') {
			return Promise.resolve({ id: 'dest-enrollment', isActive: true, paymentCutoffDay: 30 })
		}
		return Promise.resolve(null)
	})

	prismaMock.paymentPeriod.findFirst.mockResolvedValue(null)
}

describe('P-Pres-5 (clausula 3.7) - transferencia fallida no escribe ni altera enrollments', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	/** Validates: Requirements 3.7 */
	test('transferencia que falla antes de la transaccion: 0 escrituras tx y status esperado', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom<FailureScenario>(
					'student-not-found',
					'class-not-found',
					'different-sport',
					'not-enrolled-origin',
					'capacity-exceeded',
					'already-enrolled-dest'
				),
				async (scenario) => {
					jest.clearAllMocks()
					setupFailureScenario(scenario)

					const res = await transferPOST(
						buildJsonRequest({
							studentId: 'S1',
							fromClassId: FROM_CLASS_ID,
							toClassId: TO_CLASS_ID,
						})
					)

					// Status de error esperado para el modo de fallo.
					expect(res.status).toBe(EXPECTED_STATUS[scenario])

					// Ninguna escritura debe haber ocurrido: ni la transaccion, ni writes tx.
					expect(prismaMock.$transaction).not.toHaveBeenCalled()
					expect(tx.classEnrollment.update).not.toHaveBeenCalled()
					expect(tx.classEnrollment.create).not.toHaveBeenCalled()
					expect(tx.studentTransfer.create).not.toHaveBeenCalled()
				}
			),
			{ numRuns: 60 }
		)
	})
})

/* ============================================================================
 * P-Pres-6 (cutoff 30 explicito en origen) -> bugfix clausula 3.5 / Invariante I1 (2.4)
 *   Transferencia con origen.paymentCutoffDay = 30 en ambos branches ('crear' /
 *   'reactivar'). El destino debe quedar capturado con cutoff === 30.
 *
 * MUST PASS sobre codigo sin fix: 30 atraviesa el `?? 30` sin cambios (caso comun
 * donde el bug NO se observa) y debe seguir pasando tras el fix.
 * ==========================================================================*/

describe('P-Pres-6 (clausula 3.5 / I1) - origen cutoff 30 propaga 30 al destino', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	/** Validates: Requirements 3.5 */
	test('origen cutoff = 30 -> destino capturado = 30 en branch crear y reactivar', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom<'crear' | 'reactivar'>('crear', 'reactivar'),
				async (branch) => {
					jest.clearAllMocks()
					getServerSessionMock.mockResolvedValue({ user: { id: '1' } })

					prismaMock.student.findUnique.mockResolvedValue({ id: 'S1', name: 'Test Student' })
					prismaMock.danceClass.findUnique.mockResolvedValue({
						id: 1,
						sport: 'BAILE',
						capacity: 100,
						_count: { enrollments: 0 },
					})

					prismaMock.classEnrollment.findUnique.mockImplementation(({ where }: any) => {
						const classId = where.studentId_classId.classId
						if (classId === FROM_CLASS_ID) {
							return Promise.resolve({
								id: 'origin-enrollment',
								isActive: true,
								paymentCutoffDay: 30,
								monthlyFee: null,
							})
						}
						if (branch === 'reactivar') {
							return Promise.resolve({
								id: 'dest-enrollment',
								isActive: false,
								paymentCutoffDay: 30,
							})
						}
						return Promise.resolve(null)
					})

					prismaMock.paymentPeriod.findFirst.mockResolvedValue(null)

					let capturedDestino: number | null | undefined = undefined
					tx.classEnrollment.update.mockImplementation(({ data }: any) => {
						// La primera update desactiva el origen (data.isActive === false): se ignora.
						if (data.isActive === true || data.paymentCutoffDay !== undefined) {
							capturedDestino = data.paymentCutoffDay
						}
						return Promise.resolve({ id: 'dest-enrollment', ...data })
					})
					tx.classEnrollment.create.mockImplementation(({ data }: any) => {
						capturedDestino = data.paymentCutoffDay
						return Promise.resolve({ id: 'dest-enrollment', ...data })
					})
					tx.studentTransfer.create.mockResolvedValue({ id: 'transfer-1' })

					const res = await transferPOST(
						buildJsonRequest({
							studentId: 'S1',
							fromClassId: FROM_CLASS_ID,
							toClassId: TO_CLASS_ID,
						})
					)
					const json = await res.json()

					expect(res.status).toBe(200)
					expect(json.success).toBe(true)
					// Caso comun (origen = 30): destino queda 30 antes y despues del fix.
					expect(capturedDestino).toBe(30)
				}
			),
			{ numRuns: 40 }
		)
	})
})

/* ============================================================================
 * P-Pres-2 (edicion manual) -> bugfix clausula 3.2
 *   PUT /api/enrollments/update-payment-config con paymentCutoffDay ∈ {1..31}.
 *   El enrollment indicado se actualiza al valor enviado (en 1..31 el patron
 *   `paymentCutoffDay || 30` NO altera el valor) y solo se toca ese enrollment.
 *
 * MUST PASS sobre codigo sin fix (esta ruta esta fuera de alcance del fix; bloquea
 * la baseline actual).
 * ==========================================================================*/

describe('P-Pres-2 (clausula 3.2) - edicion manual persiste el valor enviado', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	/** Validates: Requirements 3.2 */
	test('update-payment-config con cutoff 1..31 persiste el valor y solo toca ese enrollment', async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 31 }), async (cutoff) => {
				jest.clearAllMocks()

				const enrollmentId = 'enrollment-target'

				prismaMock.classEnrollment.findUnique.mockResolvedValue({
					id: enrollmentId,
					student: { id: 'S1' },
					danceClass: { id: 1 },
				})

				let capturedCutoff: unknown = undefined
				let capturedWhereId: unknown = undefined
				prismaMock.classEnrollment.update.mockImplementation(({ where, data }: any) => {
					capturedWhereId = where.id
					capturedCutoff = data.paymentCutoffDay
					return Promise.resolve({
						id: enrollmentId,
						paymentCutoffDay: data.paymentCutoffDay,
						monthlyFee: data.monthlyFee,
						student: { id: 'S1' },
						danceClass: { id: 1 },
					})
				})

				const res = await updateConfigPUT(
					buildJsonRequest({ enrollmentId, paymentCutoffDay: cutoff })
				)
				const json = await res.json()

				expect(res.status).toBe(200)
				expect(json.success).toBe(true)
				// El valor enviado (truthy en 1..31) se persiste tal cual.
				expect(capturedCutoff).toBe(cutoff)
				// Solo se actualiza el enrollment indicado (no afecta otros del estudiante).
				expect(capturedWhereId).toBe(enrollmentId)
				expect(prismaMock.classEnrollment.update).toHaveBeenCalledTimes(1)
			}),
			{ numRuns: 50 }
		)
	})
})

/* ============================================================================
 * P-Pres-4 (helper baseline / lookup sin enrollment) -> bugfix clausulas 2.7, 3.6
 *   Espejo puro del patron actual `enrollment?.paymentCutoffDay || 30` disperso por
 *   los call sites del modulo de pagos. Documenta la baseline degrade-to-30 que el
 *   fix (helper `resolveCutoffDay` con `??`) debe preservar para los valores 1..31 y
 *   para la ausencia de enrollment.
 *
 * MUST PASS sobre codigo sin fix: es una replica de la logica actual.
 * ==========================================================================*/

/** Espejo del patron de lectura actual (NO importa codigo de produccion: documenta baseline). */
function readCurrent(enrollment: { paymentCutoffDay?: number | null } | null | undefined): number {
	return enrollment?.paymentCutoffDay || 30
}

describe('P-Pres-4 (clausulas 2.7, 3.6) - baseline degrade-to-30 del lookup actual', () => {
	/** Validates: Requirements 3.6 */
	test('sin enrollment activo (null/undefined) -> 30', () => {
		fc.assert(
			fc.property(fc.constantFrom<null | undefined>(null, undefined), (enrollment) => {
				expect(readCurrent(enrollment)).toBe(30)
			}),
			{ numRuns: 10 }
		)
	})

	/** Validates: Requirements 3.5 */
	test('enrollment con cutoff en 1..31 -> ese mismo valor', () => {
		fc.assert(
			fc.property(fc.integer({ min: 1, max: 31 }), (cutoff) => {
				expect(readCurrent({ paymentCutoffDay: cutoff })).toBe(cutoff)
			}),
			{ numRuns: 50 }
		)
	})

	/** Validates: Requirements 2.7 */
	test('enrollment con cutoff null -> 30 (red de seguridad)', () => {
		expect(readCurrent({ paymentCutoffDay: null })).toBe(30)
	})
})
