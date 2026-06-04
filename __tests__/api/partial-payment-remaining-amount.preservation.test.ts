/**
 * @jest-environment node
 *
 * Spec: partial-payment-remaining-amount-fix
 * Tarea 2: Tests de preservacion property-based (ANTES del fix, observation-first).
 *
 * Property 2: Preservation - Comportamiento no-bug inalterado.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 *
 * Metodologia observation-first: se ejecuta el codigo SIN fix sobre inputs ¬C(X)
 * (que NO disparan la Bug Condition de bugfix.md / design.md), se OBSERVA la salida real
 * y se aserta esa salida. Esto fija la baseline a preservar para que el fix (Tarea 3)
 * no introduzca regresiones (design.md > Correctness Properties > Property 4: F(X) = F'(X)).
 *
 * Salida observada sobre el codigo SIN modificar (TODOS los tests PASAN):
 *   P-Pres-1: received == effectiveExpected -> payment.status = PAID, 0 restantes PENDING.
 *   P-Pres-2: discount > 0 con received == effectiveExpected (additionalDebt 0) -> PAID, 0 restantes.
 *   P-Pres-3: marcar el pago de la clase A no altera expectedAmount/status del pago de la clase B.
 *   P-Pres-4: corte 30 resoluble -> dueDate del restante = dia 5 del mes siguiente (calculateDueDate(30)).
 *   P-Pres-5: generateMonthlyPayments sin parciales previos -> mensualidad PENDING con monto completo.
 *   P-Pres-6: parcial valido conciliado -> remainingAmount = effectiveExpectedAmount - receivedAmount.
 *
 * El mock de Prisma replica el de la suite exploratoria (mismo store en memoria y seeds)
 * para mantener ambas suites consistentes pero independientes.
 */

import fc from 'fast-check'

jest.mock('@/lib/prisma', () => {
	let state: any = null

	const clone = (o: any) => (o == null ? o : { ...o })

	const matchPayment = (p: any, where: any): boolean => {
		if (!where) return true
		if (where.id !== undefined && p.id !== where.id) return false
		if (where.studentId !== undefined && p.studentId !== where.studentId) return false
		if (where.classId !== undefined && p.classId !== where.classId) return false
		if (where.periodId !== undefined && p.periodId !== where.periodId) return false
		if (where.status !== undefined) {
			if (typeof where.status === 'object' && Array.isArray(where.status.in)) {
				if (!where.status.in.includes(p.status)) return false
			} else if (p.status !== where.status) {
				return false
			}
		}
		return true
	}

	const includePayment = (p: any, include: any) => {
		const out: any = { ...p }
		if (!include) return out
		if (include.student) out.student = clone(state.students.find((s: any) => s.id === p.studentId))
		if (include.period) out.period = clone(state.periods.find((x: any) => x.id === p.periodId))
		if (include.feeConfig) out.feeConfig = clone(state.feeConfigs.find((f: any) => f.id === p.feeConfigId))
		if (include.danceClass) {
			const dc = state.danceClasses.find((d: any) => d.id === p.classId)
			out.danceClass = dc ? { id: dc.id, name: dc.name, sport: dc.sport } : null
		}
		return out
	}

	const project = (row: any, select: any) => {
		if (!select || !row) return clone(row)
		const out: any = {}
		Object.keys(select).forEach((k) => {
			if (select[k]) out[k] = row[k]
		})
		return out
	}

	const prisma: any = {
		monthlyPayment: {
			findUnique: jest.fn(async ({ where, include, select }: any) => {
				const row = state.payments.find((p: any) => p.id === where.id)
				if (!row) return null
				if (select) return project(row, select)
				return includePayment(row, include)
			}),
			// Sin orderBy, findFirst no garantiza orden; modelamos el orden intermitente
			// devolviendo el match mas reciente (mayor id), igual que la suite exploratoria.
			findFirst: jest.fn(async ({ where }: any) => {
				const matches = state.payments.filter((p: any) => matchPayment(p, where))
				if (matches.length === 0) return null
				const picked = matches.reduce((a: any, b: any) => (a.id > b.id ? a : b))
				return clone(picked)
			}),
			findMany: jest.fn(async ({ where }: any) => state.payments.filter((p: any) => matchPayment(p, where)).map(clone)),
			create: jest.fn(async ({ data }: any) => {
				const row = { id: ++state._seq.payment, paidAmount: null, paymentDate: null, approvedBy: null, notes: null, ...data }
				state.payments.push(row)
				return clone(row)
			}),
			update: jest.fn(async ({ where, data }: any) => {
				const row = state.payments.find((p: any) => p.id === where.id)
				Object.assign(row, data)
				return clone(row)
			}),
			delete: jest.fn(async ({ where }: any) => {
				const idx = state.payments.findIndex((p: any) => p.id === where.id)
				const [removed] = state.payments.splice(idx, 1)
				return clone(removed)
			}),
			count: jest.fn(async ({ where }: any) => state.payments.filter((p: any) => matchPayment(p, where)).length),
		},
		paymentPeriod: {
			findUnique: jest.fn(async ({ where }: any) => clone(state.periods.find((x: any) => x.id === where.id))),
		},
		student: {
			findMany: jest.fn(async ({ where }: any) => {
				const active = state.students.filter((s: any) => (where?.isActive === undefined ? true : s.isActive === where.isActive))
				return active.map((s: any) => ({
					...s,
					enrollmentData: s.enrollmentData ?? null,
					classEnrollments: state.enrollments
						.filter((e: any) => e.studentId === s.id && e.isActive)
						.map((e: any) => ({
							id: e.id,
							studentId: e.studentId,
							classId: e.classId,
							isActive: e.isActive,
							paymentCutoffDay: e.paymentCutoffDay,
							monthlyFee: e.monthlyFee,
							enrolledAt: e.enrolledAt,
							createdAt: e.createdAt,
							updatedAt: e.updatedAt,
							danceClass: { id: e.danceClass.id, name: e.danceClass.name, sport: e.danceClass.sport },
						})),
				}))
			}),
			update: jest.fn(async ({ where, data }: any) => {
				const row = state.students.find((s: any) => s.id === where.id)
				Object.assign(row, data)
				return clone(row)
			}),
		},
		monthlyFeeConfig: {
			findFirst: jest.fn(async ({ where }: any) => {
				const matches = state.feeConfigs.filter((f: any) => {
					if (where?.isActive !== undefined && f.isActive !== where.isActive) return false
					if (where?.sport !== undefined && f.sport !== where.sport) return false
					return true
				})
				if (matches.length === 0) return null
				return clone(matches.reduce((a: any, b: any) => (a.id > b.id ? a : b)))
			}),
			create: jest.fn(async ({ data }: any) => {
				const row = { id: ++state._seq.feeConfig, ...data }
				state.feeConfigs.push(row)
				return clone(row)
			}),
		},
		danceClass: {
			findUnique: jest.fn(async ({ where, select }: any) => {
				const dc = state.danceClasses.find((d: any) => d.id === where.id)
				return dc ? project(dc, select) : null
			}),
		},
		classEnrollment: {
			findFirst: jest.fn(async ({ where }: any) => {
				const match = state.enrollments.find((e: any) => {
					if (where.studentId !== undefined && e.studentId !== where.studentId) return false
					if (where.classId !== undefined && e.classId !== where.classId) return false
					if (where.isActive !== undefined && e.isActive !== where.isActive) return false
					return true
				})
				return match ? { paymentCutoffDay: match.paymentCutoffDay } : null
			}),
		},
		studentTransfer: {
			findFirst: jest.fn(async () => null),
			findMany: jest.fn(async () => []),
		},
		debt: {
			count: jest.fn(async () => 0),
		},
		receipt: {
			create: jest.fn(async ({ data }: any) => {
				const row = { id: ++state._seq.receipt, ...data }
				state.receipts.push(row)
				return clone(row)
			}),
			delete: jest.fn(async ({ where }: any) => {
				const idx = state.receipts.findIndex((r: any) => r.id === where.id)
				if (idx >= 0) state.receipts.splice(idx, 1)
				return null
			}),
		},
		$transaction: jest.fn(async (cb: any) => cb(prisma)),
		__setDb: (db: any) => {
			state = db
		},
	}

	return { prisma }
})

import { monthlyPaymentService } from '@/lib/monthly-payment-service'
import { prisma } from '@/lib/prisma'

const prismaMock = prisma as any

const STUDENT_ID = 'S1'
const CLASS_A_ID = 101
const CLASS_B_ID = 202
const PERIOD_ID = 1

type SeedOpts = {
	expected: number
	cutoffA?: number | null
	year?: number
	month?: number
}

/**
 * Construye un store en memoria con un pago PENDING (id 1) para la clase A listo para
 * marcarse como recibido. El periodo es configurable (default Junio 2025) para observar
 * el mapeo de corte -> dueDate en distintos meses.
 */
function seedSingle({ expected, cutoffA = 15, year = 2025, month = 6 }: SeedOpts) {
	return {
		payments: [
			{
				id: 1,
				studentId: STUDENT_ID,
				classId: CLASS_A_ID,
				periodId: PERIOD_ID,
				feeConfigId: 1,
				expectedAmount: expected,
				paidAmount: null,
				status: 'PENDING',
				paymentDate: null,
				approvedBy: null,
				notes: null,
				dueDate: new Date(year, month - 1, 20, 23, 59, 59),
				createdAt: new Date(),
			},
		],
		periods: [{ id: PERIOD_ID, year, month, name: `Periodo ${month}/${year}`, dueDate: null, isActive: true }],
		students: [{ id: STUDENT_ID, isActive: true, name: 'Alumno Test', hasDebt: false, enrollmentData: null }],
		danceClasses: [
			{ id: CLASS_A_ID, name: 'Clase A', sport: 'DANCE' },
			{ id: CLASS_B_ID, name: 'Clase B', sport: 'VOLLEYBALL' },
		],
		feeConfigs: [{ id: 1, isActive: true, sport: 'DANCE', amount: expected, validFrom: new Date('2000-01-01'), validUntil: null }],
		enrollments: [
			{
				id: 'E-A',
				studentId: STUDENT_ID,
				classId: CLASS_A_ID,
				isActive: true,
				paymentCutoffDay: cutoffA,
				monthlyFee: expected,
				enrolledAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				danceClass: { id: CLASS_A_ID, name: 'Clase A', sport: 'DANCE' },
			},
		],
		receipts: [],
		_seq: { payment: 1, receipt: 0, feeConfig: 1 },
	} as any
}

/**
 * Construye un store con DOS pagos PENDING independientes (clase A id 1, clase B id 2)
 * para el mismo (studentId, periodId). Permite observar que marcar el pago de una clase
 * no altera el de la otra.
 */
function seedTwoClasses(expectedA: number, expectedB: number) {
	const db = seedSingle({ expected: expectedA, cutoffA: 15 })
	db.payments.push({
		id: 2,
		studentId: STUDENT_ID,
		classId: CLASS_B_ID,
		periodId: PERIOD_ID,
		feeConfigId: 2,
		expectedAmount: expectedB,
		paidAmount: null,
		status: 'PENDING',
		paymentDate: null,
		approvedBy: null,
		notes: null,
		dueDate: new Date(2025, 5, 5, 23, 59, 59),
		createdAt: new Date(),
	})
	db.feeConfigs.push({ id: 2, isActive: true, sport: 'VOLLEYBALL', amount: expectedB, validFrom: new Date('2000-01-01'), validUntil: null })
	db.enrollments.push({
		id: 'E-B',
		studentId: STUDENT_ID,
		classId: CLASS_B_ID,
		isActive: true,
		paymentCutoffDay: 30,
		monthlyFee: expectedB,
		enrolledAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
		danceClass: { id: CLASS_B_ID, name: 'Clase B', sport: 'VOLLEYBALL' },
	})
	db._seq.payment = 2
	return db
}

/**
 * Construye un store con un estudiante activo inscrito en la clase A pero SIN pagos
 * previos, para observar la generacion normal de mensualidades.
 */
function seedForGeneration(monthlyFee: number, cutoff: number, year = 2025, month = 6) {
	return {
		payments: [],
		periods: [{ id: PERIOD_ID, year, month, name: `Periodo ${month}/${year}`, dueDate: null, isActive: true }],
		students: [{ id: STUDENT_ID, isActive: true, name: 'Alumno Test', hasDebt: false, enrollmentData: null }],
		danceClasses: [{ id: CLASS_A_ID, name: 'Clase A', sport: 'DANCE' }],
		feeConfigs: [{ id: 1, isActive: true, sport: 'DANCE', amount: monthlyFee, validFrom: new Date('2000-01-01'), validUntil: null }],
		enrollments: [
			{
				id: 'E-A',
				studentId: STUDENT_ID,
				classId: CLASS_A_ID,
				isActive: true,
				paymentCutoffDay: cutoff,
				monthlyFee,
				enrolledAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date(),
				danceClass: { id: CLASS_A_ID, name: 'Clase A', sport: 'DANCE' },
			},
		],
		receipts: [],
		_seq: { payment: 0, receipt: 0, feeConfig: 1 },
	} as any
}

const paymentRow = (db: any, id: number) => db.payments.find((p: any) => p.id === id)

const pendingRemainingRows = (db: any, classId: number) =>
	db.payments.filter(
		(p: any) => p.studentId === STUDENT_ID && p.classId === classId && p.periodId === PERIOD_ID && p.status === 'PENDING',
	)

const countPendingRemaining = (db: any, classId: number) => pendingRemainingRows(db, classId).length

/**
 * Replica el mapeo de calculateDueDate para corte 30: dia 5 del mes siguiente
 * (con manejo de cambio de anio en diciembre).
 */
function dueDateCutoff30(year: number, month: number): Date {
	let dueMonth = month + 1
	let dueYear = year
	if (dueMonth > 12) {
		dueMonth = 1
		dueYear = year + 1
	}
	return new Date(dueYear, dueMonth - 1, 5, 23, 59, 59)
}

async function markReceived(
	paymentId: number,
	args: { receivedAmount: number; additionalDebt?: number; discount?: number },
) {
	return monthlyPaymentService.markPaymentAsReceived(paymentId, {
		paymentMethod: 'CASH',
		receivedAmount: args.receivedAmount,
		additionalDebt: args.additionalDebt ?? 0,
		discount: args.discount ?? 0,
		markedBy: 'test',
	})
}

/**
 * P-Pres-1 (pago completo, Req 3.1).
 * Observacion-first: para received == effectiveExpected (sin descuento), el codigo SIN fix
 * marca el pago como PAID y NO crea pago restante.
 */
describe('Tarea 2 - P-Pres-1: pago completo se marca PAID sin restante (Req 3.1)', () => {
	test('received == effectiveExpected -> status PAID y 0 restantes PENDING', async () => {
		await fc.assert(
			fc.asyncProperty(fc.constantFrom(75000, 60000, 90000), async (expected) => {
				const db = seedSingle({ expected, cutoffA: 15 })
				prismaMock.__setDb(db)

				await markReceived(1, { receivedAmount: expected, additionalDebt: 0, discount: 0 })

				expect(paymentRow(db, 1).status).toBe('PAID')
				expect(countPendingRemaining(db, CLASS_A_ID)).toBe(0)
			}),
			{ numRuns: 30 },
		)
	})
})

/**
 * P-Pres-2 (descuento que concilia, Req 3.2 y 3.7).
 * Observacion-first: con discount > 0 y received == effectiveExpected (additionalDebt 0),
 * el codigo SIN fix trata el pago como completo: PAID, sin restante.
 */
describe('Tarea 2 - P-Pres-2: descuento que concilia se trata como completo (Req 3.2, 3.7)', () => {
	test('discount > 0 con received == expected - discount -> PAID y 0 restantes', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom(75000, 60000, 90000),
				fc.constantFrom(5000, 10000, 20000),
				async (expected, discount) => {
					const received = expected - discount // == effectiveExpected
					const db = seedSingle({ expected, cutoffA: 15 })
					prismaMock.__setDb(db)

					await markReceived(1, { receivedAmount: received, additionalDebt: 0, discount })

					expect(paymentRow(db, 1).status).toBe('PAID')
					expect(countPendingRemaining(db, CLASS_A_ID)).toBe(0)
				},
			),
			{ numRuns: 30 },
		)
	})
})

/**
 * P-Pres-3 (independencia multi-clase, Req 3.3).
 * Observacion-first: marcar el pago de la clase A (completo) no altera el expectedAmount
 * ni el status del pago de la clase B para el mismo (studentId, periodId).
 */
describe('Tarea 2 - P-Pres-3: el pago de una clase no altera el de otra (Req 3.3)', () => {
	test('marcar pago de clase A deja invariante expectedAmount/status del pago de clase B', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom(75000, 60000, 90000),
				fc.constantFrom(50000, 80000, 45000),
				async (expectedA, expectedB) => {
					const db = seedTwoClasses(expectedA, expectedB)
					prismaMock.__setDb(db)

					await markReceived(1, { receivedAmount: expectedA, additionalDebt: 0, discount: 0 })

					const classBPayment = paymentRow(db, 2)
					expect(classBPayment.expectedAmount).toBe(expectedB)
					expect(classBPayment.status).toBe('PENDING')
				},
			),
			{ numRuns: 30 },
		)
	})
})

/**
 * P-Pres-4 (corte 30 resoluble, Req 3.4).
 * Observacion-first: con un parcial valido conciliado (received + additionalDebt == expected)
 * y corte 30 resoluble, el restante PENDING se crea con dueDate = dia 5 del mes siguiente.
 */
describe('Tarea 2 - P-Pres-4: corte 30 -> dueDate dia 5 del mes siguiente (Req 3.4)', () => {
	test('forall periodo, corte 30 -> calculateDueDate(30) == dia 5 del mes siguiente', async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 12 }), async (month) => {
				const expected = 75000
				const received = 58000
				const additionalDebt = expected - received
				const db = seedSingle({ expected, cutoffA: 30, year: 2025, month })
				prismaMock.__setDb(db)

				await markReceived(1, { receivedAmount: received, additionalDebt, discount: 0 })

				const remaining = pendingRemainingRows(db, CLASS_A_ID)[0]
				const expectedDue = dueDateCutoff30(2025, month)
				expect(remaining?.dueDate?.getTime()).toBe(expectedDue.getTime())
			}),
			{ numRuns: 24 },
		)
	})
})

/**
 * P-Pres-5 (generacion sin parciales previos, Req 3.5).
 * Observacion-first: generateMonthlyPayments en un periodo sin pagos previos crea una
 * mensualidad PENDING con expectedAmount == mensualidad completa.
 */
describe('Tarea 2 - P-Pres-5: generacion sin parciales crea PENDING con monto completo (Req 3.5)', () => {
	test('forall mensualidad sin parcial previo -> PENDING con expectedAmount completo', async () => {
		await fc.assert(
			fc.asyncProperty(fc.constantFrom(75000, 60000, 90000), fc.constantFrom(15, 30), async (monthlyFee, cutoff) => {
				const db = seedForGeneration(monthlyFee, cutoff)
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

				const created = db.payments.filter(
					(p: any) => p.studentId === STUDENT_ID && p.classId === CLASS_A_ID && p.periodId === PERIOD_ID,
				)
				expect(created).toHaveLength(1)
				expect(created[0].status).toBe('PENDING')
				expect(created[0].expectedAmount).toBe(monthlyFee)
			}),
			{ numRuns: 30 },
		)
	})
})

/**
 * P-Pres-6 (formula y redondeo del restante, Req 3.6).
 * Observacion-first: para parciales validos conciliados, el restante persistido es
 * exactamente effectiveExpectedAmount - receivedAmount (sin alterar el redondeo vigente).
 */
describe('Tarea 2 - P-Pres-6: formula del restante = effectiveExpected - received (Req 3.6)', () => {
	test('parcial valido -> remainingAmount == effectiveExpectedAmount - receivedAmount', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom(75000, 60000, 90000),
				fc.constantFrom(0, 5000, 10000),
				fc.constantFrom(15000, 20000, 30000),
				async (expected, discount, additionalDebt) => {
					const effectiveExpected = Math.max(0, expected - discount)
					const received = effectiveExpected - additionalDebt
					// Mantener un parcial valido conciliado: received < effectiveExpected y received > 0.
					fc.pre(received > 0)
					fc.pre(received < effectiveExpected)

					const db = seedSingle({ expected, cutoffA: 15 })
					prismaMock.__setDb(db)

					await markReceived(1, { receivedAmount: received, additionalDebt, discount })

					const remaining = pendingRemainingRows(db, CLASS_A_ID)[0]
					expect(remaining?.expectedAmount).toBe(effectiveExpected - received)
				},
			),
			{ numRuns: 40 },
		)
	})
})
