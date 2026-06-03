/**
 * @jest-environment node
 *
 * Spec: inherit-cutoff-day-on-transfer
 * Tarea 1: Test exploratorio property-based de la Bug Condition (ANTES del fix).
 *
 * Property 1: Bug Condition - Herencia y lectura del cutoff.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.7
 *
 * isBugCondition(input) (design.md > Bug Condition):
 *   - action = TRANSFER_STUDENT: result.success = true AND destino.paymentCutoffDay <> origen.paymentCutoffDay
 *   - action = READ_PAYMENT_CUTOFF: existe enrollment activo (studentId, classId) con cutoff <> null
 *     AND readValue <> enrollment.paymentCutoffDay
 *
 * ESTE TEST DEBE FALLAR sobre el codigo SIN fix. La falla confirma que el bug existe.
 * NO se debe arreglar el test ni el codigo cuando falle: la falla es la senal de exito.
 * Una vez aplicado el fix (Tareas 3-6) este mismo test codifica el Expected Behavior (Tarea 7.1).
 *
 * Contraejemplos esperados sobre el codigo sin fix:
 *   Sub-condicion A (TRANSFER_STUDENT, transfer/route.ts linea ~148 `?? 30`):
 *     - transfer({ origen.cutoff: null, branch: 'crear' })    -> destino.cutoff = 30  (esperado null)
 *     - transfer({ origen.cutoff: null, branch: 'reactivar' }) -> destino.cutoff = 30  (esperado null)
 *     (cuando origen tiene un valor real distinto de null el `?? 30` lo deja pasar, por eso
 *      el contraejemplo concreto que demuestra el bug observado es origen = null -> destino 30)
 *   Sub-condicion B (READ_PAYMENT_CUTOFF, lib/payment-utils.ts buildCutoffDaysMap,
 *   indexado por (studentId, classId)):
 *     - dos estudiantes en el mismo classId con cutoff distinto (p.ej. 15 y 30):
 *       con la logica vieja (solo classId) el map devolvia un unico valor compartido;
 *       con la logica corregida cada (studentId, classId) resuelve a su propio cutoff.
 */

import fc from 'fast-check'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/nextauth', () => ({ authOptions: {} }))

jest.mock('@/lib/prisma', () => {
	const student = { findUnique: jest.fn() }
	const danceClass = { findUnique: jest.fn() }
	const classEnrollment = { findUnique: jest.fn() }
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

import { POST } from '@/app/api/enrollments/transfer/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { buildCutoffDaysMap, cutoffMapKey } from '@/lib/payment-utils'

const getServerSessionMock = getServerSession as jest.Mock
const prismaMock = prisma as any
const tx = (prisma as any).__tx

const FROM_CLASS_ID = 1
const TO_CLASS_ID = 2

function buildTransferRequest(body: Record<string, unknown>) {
	return {
		json: async () => body,
	} as any
}

describe('Tarea 1 - Bug Condition exploratorio (debe FALLAR sin fix)', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	/**
	 * Sub-condicion A (TRANSFER_STUDENT):
	 * Invariante post-transferencia: destino.paymentCutoffDay = origen.paymentCutoffDay,
	 * incluyendo el caso origen = null. Sobre codigo sin fix, origen = null queda como 30
	 * en el destino por el `?? 30` de transfer/route.ts -> contraejemplo.
	 */
	test('Sub-condicion A: el destino hereda el cutoff del origen (incluido null)', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom<number | null>(15, 7, 1, 31, null),
				fc.constantFrom<'crear' | 'reactivar'>('crear', 'reactivar'),
				async (cutoffOrigen, branch) => {
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
								paymentCutoffDay: cutoffOrigen,
								monthlyFee: null,
							})
						}
						// Destino
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

					// Captura el paymentCutoffDay que el handler persiste en el DESTINO.
					let capturedDestino: number | null | undefined = undefined
					tx.classEnrollment.update.mockImplementation(({ data }: any) => {
						// La primera update desactiva el origen (data.isActive === false): se ignora.
						// La update de reactivacion lleva isActive: true + paymentCutoffDay.
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

					const res = await POST(
						buildTransferRequest({
							studentId: 'S1',
							fromClassId: FROM_CLASS_ID,
							toClassId: TO_CLASS_ID,
						})
					)
					const json = await res.json()

					expect(res.status).toBe(200)
					expect(json.success).toBe(true)
					// Invariante I1: el destino debe quedar exactamente con el cutoff del origen.
					// Sobre codigo sin fix esto FALLA cuando cutoffOrigen === null (queda 30).
					expect(capturedDestino).toBe(cutoffOrigen)
				}
			),
			{ numRuns: 60 }
		)
	})
})

/**
 * Sub-condicion B (READ_PAYMENT_CUTOFF):
 * Verifica la logica REAL de indexado del bulk lookup (lib/payment-utils.ts
 * `buildCutoffDaysMap`), que ahora indexa por `${studentId}:${classId}`.
 * Antes del fix el map se indexaba SOLO por classId y dos estudiantes de la misma
 * clase con cutoff distinto se pisaban entre si. Con el fix cada (studentId, classId)
 * resuelve a su propio cutoff.
 */
type EnrollmentRow = { studentId: string; classId: number; paymentCutoffDay: number | null }

describe('Tarea 1 - Sub-condicion B: lectura del cutoff por (studentId, classId)', () => {
	/**
	 * Dos estudiantes en el MISMO classId con cutoff distinto. La lectura por
	 * (studentId, classId) debe devolver el cutoff propio de cada estudiante.
	 * Sobre el codigo SIN fix (map keyed solo por classId) esto FALLABA; con el fix PASA.
	 */
	test('lectura por estudiante no debe mezclarse entre estudiantes de la misma clase', () => {
		fc.assert(
			fc.property(
				fc
					.record({
						classId: fc.integer({ min: 1, max: 1000 }),
						cutoffA: fc.integer({ min: 1, max: 31 }),
						cutoffB: fc.integer({ min: 1, max: 31 }),
					})
					.filter(({ cutoffA, cutoffB }) => cutoffA !== cutoffB),
				({ classId, cutoffA, cutoffB }) => {
					const studentA = 'student-A'
					const studentB = 'student-B'
					const enrollments: EnrollmentRow[] = [
						{ studentId: studentA, classId, paymentCutoffDay: cutoffA },
						{ studentId: studentB, classId, paymentCutoffDay: cutoffB },
					]

					const cutoffDaysMap = buildCutoffDaysMap(enrollments)

					const readForA = cutoffDaysMap.get(cutoffMapKey(studentA, classId))
					const readForB = cutoffDaysMap.get(cutoffMapKey(studentB, classId))

					expect(readForA).toBe(cutoffA)
					expect(readForB).toBe(cutoffB)
				}
			),
			{ numRuns: 60 }
		)
	})
})
