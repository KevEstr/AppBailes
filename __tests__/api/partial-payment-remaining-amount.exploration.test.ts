/**
 * @jest-environment node
 *
 * Spec: partial-payment-remaining-amount-fix
 * Tarea 1: Test exploratorio property-based de la Bug Condition (ANTES del fix).
 *
 * Property 1: Bug Condition - Monto restante, conciliacion, idempotencia y dia de corte
 *             en pago parcial.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 *
 * isBugCondition(X) (bugfix.md / design.md > Bug Condition) cubre dos acciones:
 *   - action = MARK_PARTIAL_PAYMENT: el restante persistido no es additionalDebt /
 *     effectiveExpected - received, o se acepta una conciliacion invalida
 *     (received + additionalDebt + discount != expected), o no queda exactamente
 *     un restante PENDING para (studentId, classId, periodId).
 *   - action = READ_RECEIPT_CUTOFF: el corte usado para el recibo/dueDate difiere del
 *     corte de la inscripcion activa de la (studentId, classId) propia del pago.
 *
 * ESTE TEST DEBE FALLAR sobre el codigo SIN fix. La falla confirma que los bugs existen.
 * NO se debe arreglar el test ni el codigo cuando falle: la falla es la senal de exito.
 * Una vez aplicado el fix (Tarea 3) este MISMO test codifica el Expected Behavior (Tarea 3.2).
 *
 * Contraejemplos esperados sobre el codigo SIN fix:
 *   B.1 (generateMonthlyPayments, ~linea 152, findFirst sin filtro de status ni orden):
 *     markPaymentAsReceived(expected=75000, received=58000, additionalDebt=17000)
 *     + generateMonthlyPayments(regenerate=true)
 *       -> el restante PENDING queda en 75000 (mensualidad completa) en vez de 17000.
 *   B.2 (markPaymentAsReceived, ~linea 609, additionalDebt recibido pero no validado):
 *     API con received=58000 + additionalDebt=10000 (suma 68000 != 75000)
 *       -> el servidor ignora additionalDebt, crea restante = 17000 y ACEPTA la operacion
 *          (esperado: rechazo atomico con codigo PARTIAL_AMOUNT_MISMATCH y 0 restantes).
 *   A   (resolveCutoffDay, lib/payment-utils.ts ~linea 16, fallback silencioso `?? 30`):
 *     inscripcion con corte 15 no resoluble (paymentCutoffDay nulo / multi-clase)
 *       -> resolveCutoffDay retorna 30 y dueDate cae al dia 5 del mes siguiente
 *          (esperado: corte 15 -> dueDate dia 20 del mismo mes).
 *
 * Contraejemplos OBSERVADOS al ejecutar sobre el codigo SIN fix (los 6 tests fallan):
 *   B.1: Counterexample [75000,17000] -> persistedRemainingAmount = 75000 (esperado 17000).
 *        Caso reportado 75000/58000/17000 -> restante 75000 tras generateMonthlyPayments(true).
 *   B.2: Counterexample [75000,58000,10000] -> la promesa RESUELVE en vez de rechazar; se crea
 *        restante = 17000 con status PARTIAL_PAID y recibo, sin error PARTIAL_AMOUNT_MISMATCH
 *        (additionalDebt 10000 ignorado; suma 68000 != 75000 aceptada).
 *   A:   Counterexample [null,false] -> dueDate getMonth() = 6 (Julio) / dia 5, esperado
 *        getMonth() = 5 (Junio) / dia 20. resolveCutoffDay cayo a 30 por el fallback `?? 30`.
 */

import fc from 'fast-check'

// Mock auto-contenido de Prisma con un store en memoria. Toda la logica de query vive
// dentro de la factory (requisito de jest.mock); el test solo construye datos planos via
// `prisma.__setDb(db)` y luego inspecciona `db` para asertar el estado persistido.
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
			// Prisma findFirst SIN orderBy no garantiza orden. Modelamos el orden
			// intermitente que en produccion expone el bug B.1: devolvemos el match mas
			// reciente (mayor id), que tras un parcial es la fila PENDING del restante.
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
		// resolveCutoffDay: findFirst({ where: { studentId, classId, isActive }, select: { paymentCutoffDay } })
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
const PERIOD_ID = 1

type SeedOpts = { expected: number; cutoffA: number | null; withClassB?: boolean }

/**
 * Construye un store en memoria para una (studentId, classId, periodId) con un pago
 * PENDING (id 1) listo para marcarse como recibido. El periodo es Junio 2025, de modo
 * que calculateDueDate(15) -> 20/Jun y calculateDueDate(30) -> 5/Jul.
 */
function seedDb({ expected, cutoffA, withClassB = false }: SeedOpts) {
	const db: any = {
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
				dueDate: new Date(2025, 5, 20, 23, 59, 59),
				createdAt: new Date(),
			},
		],
		periods: [{ id: PERIOD_ID, year: 2025, month: 6, name: 'Junio 2025', dueDate: null, isActive: true }],
		students: [{ id: STUDENT_ID, isActive: true, name: 'Alumno Test', hasDebt: false, enrollmentData: null }],
		danceClasses: [
			{ id: CLASS_A_ID, name: 'Clase A', sport: 'DANCE' },
			{ id: 202, name: 'Clase B', sport: 'VOLLEYBALL' },
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
	}
	if (withClassB) {
		db.enrollments.push({
			id: 'E-B',
			studentId: STUDENT_ID,
			classId: 202,
			isActive: true,
			paymentCutoffDay: 30,
			monthlyFee: 60000,
			enrolledAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
			danceClass: { id: 202, name: 'Clase B', sport: 'VOLLEYBALL' },
		})
	}
	return db
}

const pendingRemainingRows = (db: any) =>
	db.payments.filter(
		(p: any) => p.studentId === STUDENT_ID && p.classId === CLASS_A_ID && p.periodId === PERIOD_ID && p.status === 'PENDING',
	)

const persistedRemainingAmount = (db: any) => pendingRemainingRows(db)[0]?.expectedAmount
const countPendingRemaining = (db: any) => pendingRemainingRows(db).length

async function markPartial(args: { receivedAmount: number; additionalDebt: number; discount?: number }) {
	return monthlyPaymentService.markPaymentAsReceived(1, {
		paymentMethod: 'CASH',
		receivedAmount: args.receivedAmount,
		additionalDebt: args.additionalDebt,
		discount: args.discount ?? 0,
		markedBy: 'test',
	})
}

/**
 * Sub-caso B.1 (idempotencia, MARK_PARTIAL_PAYMENT + regeneracion).
 *
 * Property 3 (design.md): tras un parcial conciliado y una regeneracion, debe quedar
 * EXACTAMENTE un restante PENDING con expectedAmount == additionalDebt, nunca la
 * mensualidad completa.
 *
 * EXPECTED OUTCOME sobre codigo SIN fix: FALLA. generateMonthlyPayments usa
 * findFirst({ where: { studentId, classId, periodId } }) sin filtro de status: tras el
 * parcial selecciona la fila PENDING del restante y, como regenerate=true, la reescribe
 * con la mensualidad completa (p.ej. 75000) -> contraejemplo.
 */
describe('Tarea 1 - Sub-caso B.1: idempotencia del restante tras regeneracion (debe FALLAR sin fix)', () => {
	test('el restante PENDING se mantiene en additionalDebt tras generateMonthlyPayments(regenerate=true)', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom(75000, 60000, 90000),
				fc.constantFrom(17000, 5000, 30000),
				async (expected, additionalDebt) => {
					const receivedAmount = expected - additionalDebt
					const db = seedDb({ expected, cutoffA: 15 })
					prismaMock.__setDb(db)

					await markPartial({ receivedAmount, additionalDebt, discount: 0 })
					await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, true)

					expect(persistedRemainingAmount(db)).toBe(additionalDebt)
					expect(countPendingRemaining(db)).toBe(1)
				},
			),
			{ numRuns: 40 },
		)
	})

	// Caso concreto reportado (75000 / received 58000 / additionalDebt 17000) para reproducibilidad.
	test('caso reportado: 75000 parcial 58000 adeudo 17000 -> restante 17000 tras regenerar', async () => {
		const db = seedDb({ expected: 75000, cutoffA: 15 })
		prismaMock.__setDb(db)

		await markPartial({ receivedAmount: 58000, additionalDebt: 17000, discount: 0 })
		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, true)

		expect(persistedRemainingAmount(db)).toBe(17000)
		expect(countPendingRemaining(db)).toBe(1)
	})
})

/**
 * Sub-caso B.2 (conciliacion invalida aceptada, MARK_PARTIAL_PAYMENT via API directa).
 *
 * Property 1 (design.md): si la invariante received + additionalDebt + discount == expected
 * NO se cumple, la operacion debe rechazarse de forma atomica con codigo
 * PARTIAL_AMOUNT_MISMATCH y NO debe quedar ningun restante.
 *
 * EXPECTED OUTCOME sobre codigo SIN fix: FALLA. markPaymentAsReceived recibe additionalDebt
 * pero no lo valida: calcula remaining = effectiveExpected - received (p.ej. 17000), crea el
 * restante y ACEPTA la operacion aunque additionalDebt (10000) no concilie -> contraejemplo.
 */
describe('Tarea 1 - Sub-caso B.2: conciliacion invalida debe rechazarse (debe FALLAR sin fix)', () => {
	test('received + additionalDebt + discount != expected -> rechazo PARTIAL_AMOUNT_MISMATCH y 0 restantes', async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.constantFrom(75000, 60000, 90000),
				fc.constantFrom(58000, 40000, 20000),
				fc.constantFrom(10000, 5000, 3000),
				async (expected, receivedAmount, additionalDebt) => {
					// Mantener solo inputs donde la invariante realmente NO concilia y el pago es parcial.
					fc.pre(receivedAmount < expected)
					fc.pre(Math.abs(receivedAmount + additionalDebt - expected) > 0.01)

					const db = seedDb({ expected, cutoffA: 15 })
					prismaMock.__setDb(db)

					await expect(markPartial({ receivedAmount, additionalDebt, discount: 0 })).rejects.toThrow(
						/PARTIAL_AMOUNT_MISMATCH/,
					)
					// Rechazo atomico: el pago original (id=1) queda PENDING e intacto; no se crea restante.
					expect(countPendingRemaining(db)).toBe(1)
					const original = db.payments.find((p: any) => p.id === 1)
					expect(original.status).toBe('PENDING')
					expect(original.expectedAmount).toBe(expected)
					expect(db.payments.some((p: any) => p.status === 'PARTIAL_PAID')).toBe(false)
					const tripleRows = db.payments.filter(
						(p: any) => p.studentId === STUDENT_ID && p.classId === CLASS_A_ID && p.periodId === PERIOD_ID,
					)
					expect(tripleRows.length).toBe(1)
				},
			),
			{ numRuns: 40 },
		)
	})

	// Caso concreto reportado: received 58000 + additionalDebt 10000 (suma 68000 != 75000).
	test('caso reportado: received 58000 + additionalDebt 10000 (suma 68000 != 75000) -> rechazo atomico', async () => {
		const db = seedDb({ expected: 75000, cutoffA: 15 })
		prismaMock.__setDb(db)

		await expect(markPartial({ receivedAmount: 58000, additionalDebt: 10000, discount: 0 })).rejects.toThrow(
			/PARTIAL_AMOUNT_MISMATCH/,
		)
		// Rechazo atomico: el pago original (id=1) queda PENDING e intacto; no se crea restante.
		const expected = 75000
		expect(countPendingRemaining(db)).toBe(1)
		const original = db.payments.find((p: any) => p.id === 1)
		expect(original.status).toBe('PENDING')
		expect(original.expectedAmount).toBe(expected)
		expect(db.payments.some((p: any) => p.status === 'PARTIAL_PAID')).toBe(false)
		const tripleRows = db.payments.filter(
			(p: any) => p.studentId === STUDENT_ID && p.classId === CLASS_A_ID && p.periodId === PERIOD_ID,
		)
		expect(tripleRows.length).toBe(1)
	})
})

/**
 * Sub-caso A (READ_RECEIPT_CUTOFF): corte 15 no resoluble y/o estudiante multi-clase.
 *
 * Property 2 (design.md): el corte usado para el recibo/dueDate debe ser el de la
 * inscripcion activa de la (studentId, classId) propia del pago. Corte 15 -> dueDate dia 20
 * del mismo mes (calculateDueDate(15)).
 *
 * EXPECTED OUTCOME sobre codigo SIN fix: FALLA. resolveCutoffDay cae al fallback `?? 30`
 * cuando el corte no es resoluble (paymentCutoffDay nulo) -> dueDate dia 5 del mes
 * siguiente (calculateDueDate(30)) en vez del dia 20 del mismo mes -> contraejemplo.
 *
 * El restante del parcial usa el cutoff resuelto para calcular su dueDate; lo inspeccionamos
 * directamente sobre la fila PENDING persistida.
 */
describe('Tarea 1 - Sub-caso A: corte 15 leido como 30 en el recibo/dueDate (debe FALLAR sin fix)', () => {
	const remainingDueDate = (db: any) => pendingRemainingRows(db)[0]?.dueDate as Date | undefined

	test('corte 15 no resoluble / multi-clase -> dueDate dia 20 del mismo mes', async () => {
		await fc.assert(
			fc.asyncProperty(
				// corte de la inscripcion de la clase del pago: 15 explicito o null (no resoluble)
				fc.constantFrom<number | null>(15, null),
				fc.boolean(),
				async (cutoffA, withClassB) => {
					const db = seedDb({ expected: 75000, cutoffA, withClassB })
					prismaMock.__setDb(db)

					await markPartial({ receivedAmount: 58000, additionalDebt: 17000, discount: 0 })

					const due = remainingDueDate(db)
					// Expected Behavior: corte 15 -> dia 20 del mismo mes (Junio = mes index 5).
					expect(due?.getMonth()).toBe(5)
					expect(due?.getDate()).toBe(20)
				},
			),
			{ numRuns: 30 },
		)
	})

	// Caso concreto: corte 15 no resoluble (paymentCutoffDay null) -> hoy resuelve 30 (dia 5 de Julio).
	test('caso reportado: corte 15 no resoluble -> dueDate dia 20 del mismo mes (no dia 5 del siguiente)', async () => {
		const db = seedDb({ expected: 75000, cutoffA: null })
		prismaMock.__setDb(db)

		await markPartial({ receivedAmount: 58000, additionalDebt: 17000, discount: 0 })

		const due = pendingRemainingRows(db)[0]?.dueDate as Date
		expect(due.getMonth()).toBe(5)
		expect(due.getDate()).toBe(20)
	})
})
