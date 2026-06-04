/**
 * @jest-environment node
 *
 * Spec: regenerate-deletes-active-class-payment-after-transfer
 * Tarea 1: Test exploratorio property-based de la Bug Condition (ANTES del fix).
 *
 * Property 1: Bug Condition - Cobertura precisa por cadena de transferencia.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 *
 * Cubre los cuatro escenarios E1-E4 descritos en design.md > 8.a:
 *   E1 - Real-data shape (transferencia previa al periodo, multiclase distinto deporte).
 *   E2 - Multiclase mismo deporte sin transferencia.
 *   E3 - Cadena encadenada A -> B -> C con PAID en A y solo C activa (puede pasar
 *        accidentalmente sobre el codigo SIN fix).
 *   E4 - Ciclo en la cadena (A -> B -> A) con clase activa unica D no relacionada.
 *
 * ESTE TEST DEBE FALLAR sobre el codigo SIN fix (al menos en E1, E2 y E4). La falla
 * confirma las clausulas 1.1, 1.2, 1.3 y 1.4 de bugfix.md. NO se debe arreglar el test
 * ni el codigo cuando falle: la falla es la senal esperada. El mismo archivo se reutiliza
 * tras el fix como Property 1 - Expected Behavior (sub-tarea 3.2).
 *
 * Contraejemplos esperados sobre el codigo SIN fix:
 *   E1 (clausulas 1.1, 1.4): estudiante S1 con classId 4 BAILE activa, classId 62
 *      VOLEIBOL activa, classId 41 BAILE inactiva, transferencia 41 -> 4 con
 *      transferredAt anterior al inicio del periodo y PAID en classId 41 -> NO se crea
 *      el monthly_payment PENDING para classId 62 (esperado: exactamente uno).
 *   E2 (clausulas 1.1, 1.2): estudiante S1 con classes A y B activas (mismo deporte),
 *      sin student_transfers, PAID en classId C inactiva -> ni A ni B reciben PENDING
 *      (esperado: dos PENDING independientes).
 *   E3 (clausulas 1.1, 1.3): cadena A -> B -> C con PAID en A y unica activa C; el
 *      PENDING preexistente en C se elimina como duplicado del principal y no se crea
 *      uno nuevo. La heuristica gruesa puede coincidir accidentalmente con el Expected
 *      Behavior; el test sirve como guarda de regresion una vez aplicado el fix.
 *   E4 (clausulas 1.1, 1.2): ciclo A -> B -> A con PAID en A y unica activa D no
 *      relacionada -> NO se crea PENDING para D (esperado: exactamente uno; la cadena
 *      no cubre D).
 *
 * Contraejemplos OBSERVADOS al ejecutar sobre el codigo SIN fix (E1, E2 y E4 fallan; E3
 * pasa accidentalmente segun lo previsto en design.md > 8.a):
 *   E1: Counterexample [10000, 2026-05-31] -> pendingsFor62 length 0 (esperado 1). Caso
 *       concreto 70000 con transferredAt 2026-05-15 reproduce la falla. La heuristica
 *       gruesa de la rama `else` (~lineas 260-290 de lib/monthly-payment-service.ts)
 *       trata el PAID de classId 41 como cobertura para todas las activas y omite la
 *       creacion del PENDING para classId 62 (VOLEIBOL, sin cadena hacia 41). Confirma
 *       las clausulas 1.1 y 1.4 de bugfix.md.
 *   E2: Counterexample [[10,20,30], 10000] -> pendingFor(a) length 0. Caso concreto
 *       A=10, B=20, C=30, expected=80000 reproduce la falla. La misma heuristica trata
 *       el PAID en C inactiva como cobertura del periodo para A y B aunque no exista
 *       ninguna transferencia. Confirma las clausulas 1.1 y 1.2 de bugfix.md.
 *   E3: PASA accidentalmente en property y caso concreto (cadena 71 -> 72 -> 73 con
 *       PAID en 71 y unica activa 73). La heuristica gruesa coincide con el Expected
 *       Behavior porque el PAID en clase inactiva 71 cubre la unica activa 73; el test
 *       seguira pasando tras el fix porque la cadena se reconoce explicitamente.
 *   E4: Counterexample [[15,25,45], 10000] -> pendingsForD length 0. Caso concreto
 *       A=15, B=25, D=45, expected=70000 reproduce la falla. La heuristica gruesa cubre
 *       D (no relacionada con la cadena ciclica A -> B -> A) con el PAID en classId A
 *       y omite la creacion del PENDING. Confirma las clausulas 1.1 y 1.2 de bugfix.md.
 */

import fc from 'fast-check'

// Mock auto-contenido de Prisma con un store en memoria. Toda la logica vive dentro de
// la factory (requisito de jest.mock); el test solo construye datos planos via
// `prisma.__setDb(db)` y luego inspecciona `db` para asertar el estado persistido.
jest.mock('@/lib/prisma', () => {
	let state: any = null

	const clone = (o: any) => (o == null ? o : { ...o })

	const matchPayment = (p: any, where: any): boolean => {
		if (!where) return true
		if (where.id !== undefined && p.id !== where.id) return false
		if (where.studentId !== undefined && p.studentId !== where.studentId) return false
		if (where.periodId !== undefined && p.periodId !== where.periodId) return false
		if (where.classId !== undefined) {
			const c = where.classId
			if (c === null) {
				if (p.classId !== null) return false
			} else if (typeof c === 'object') {
				if (Array.isArray(c.in) && !c.in.includes(p.classId)) return false
				if (Array.isArray(c.notIn) && c.notIn.includes(p.classId)) return false
			} else if (p.classId !== c) {
				return false
			}
		}
		if (where.status !== undefined) {
			if (typeof where.status === 'object' && Array.isArray(where.status.in)) {
				if (!where.status.in.includes(p.status)) return false
			} else if (p.status !== where.status) {
				return false
			}
		}
		return true
	}

	const matchTransfer = (t: any, where: any): boolean => {
		if (!where) return true
		if (where.studentId !== undefined && t.studentId !== where.studentId) return false
		if (where.fromClassId !== undefined && t.fromClassId !== where.fromClassId) return false
		if (where.toClassId !== undefined && t.toClassId !== where.toClassId) return false
		if (where.transferredAt !== undefined) {
			const range = where.transferredAt
			if (range.gte !== undefined && t.transferredAt < range.gte) return false
			if (range.lt !== undefined && t.transferredAt >= range.lt) return false
			if (range.lte !== undefined && t.transferredAt > range.lte) return false
			if (range.gt !== undefined && t.transferredAt <= range.gt) return false
		}
		return true
	}

	const sortBy = (rows: any[], orderBy: any): any[] => {
		if (!orderBy) return rows
		const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
		const sorted = [...rows]
		sorted.sort((a, b) => {
			for (const o of orders) {
				const [field, dir] = Object.entries(o)[0] as [string, string]
				const av = a[field]
				const bv = b[field]
				let cmp = 0
				if (av instanceof Date && bv instanceof Date) cmp = av.getTime() - bv.getTime()
				else if (av < bv) cmp = -1
				else if (av > bv) cmp = 1
				if (cmp !== 0) return dir === 'desc' ? -cmp : cmp
			}
			return 0
		})
		return sorted
	}

	const prisma: any = {
		monthlyPayment: {
			findUnique: jest.fn(async ({ where }: any) => clone(state.payments.find((p: any) => p.id === where.id))),
			findFirst: jest.fn(async ({ where, orderBy }: any) => {
				const matches = state.payments.filter((p: any) => matchPayment(p, where))
				if (matches.length === 0) return null
				const sorted = sortBy(matches, orderBy)
				return clone(sorted[0])
			}),
			findMany: jest.fn(async ({ where, orderBy }: any) => {
				const matches = state.payments.filter((p: any) => matchPayment(p, where))
				return sortBy(matches, orderBy).map(clone)
			}),
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
				const active = state.students.filter((s: any) =>
					where?.isActive === undefined ? true : s.isActive === where.isActive,
				)
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
					if (where?.sport !== undefined) {
						if (where.sport === null) {
							if (f.sport !== null) return false
						} else if (f.sport !== where.sport) {
							return false
						}
					}
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
			findUnique: jest.fn(async ({ where }: any) => clone(state.danceClasses.find((d: any) => d.id === where.id))),
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
			findFirst: jest.fn(async ({ where, orderBy }: any) => {
				const matches = (state.transfers ?? []).filter((t: any) => matchTransfer(t, where))
				if (matches.length === 0) return null
				return clone(sortBy(matches, orderBy)[0])
			}),
			findMany: jest.fn(async ({ where, orderBy }: any) => {
				const matches = (state.transfers ?? []).filter((t: any) => matchTransfer(t, where))
				return sortBy(matches, orderBy).map(clone)
			}),
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
const PERIOD_ID = 27
const PERIOD_YEAR = 2026
const PERIOD_MONTH = 6 // Junio
const PERIOD_START = new Date(PERIOD_YEAR, PERIOD_MONTH - 1, 1)
const CUTOFF_DAY = 15

type DanceClassSeed = { id: number; name: string; sport: 'DANCE' | 'VOLLEYBALL' }
type EnrollmentSeed = { id: number | string; classId: number; isActive: boolean; sport: 'DANCE' | 'VOLLEYBALL'; name: string; cutoff?: number; monthlyFee?: number | null }
type PaymentSeed = { id: number; classId: number; status: 'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIAL_PAID'; expectedAmount: number; dueDate?: Date }
type TransferSeed = { id: number; fromClassId: number; toClassId: number; transferredAt: Date }

type Setup = {
	enrollments: EnrollmentSeed[]
	payments: PaymentSeed[]
	transfers: TransferSeed[]
	feeAmount: number
}

function buildDb(setup: Setup) {
	const danceClassesById = new Map<number, DanceClassSeed>()
	for (const e of setup.enrollments) {
		if (!danceClassesById.has(e.classId)) danceClassesById.set(e.classId, { id: e.classId, name: e.name, sport: e.sport })
	}
	for (const p of setup.payments) {
		if (!danceClassesById.has(p.classId)) {
			danceClassesById.set(p.classId, { id: p.classId, name: `Clase ${p.classId}`, sport: 'DANCE' })
		}
	}
	const danceClasses = Array.from(danceClassesById.values())

	const dueDateForCutoff = new Date(PERIOD_YEAR, PERIOD_MONTH - 1, 20, 23, 59, 59)

	const payments = setup.payments.map((p, idx) => ({
		id: p.id,
		studentId: STUDENT_ID,
		classId: p.classId,
		periodId: PERIOD_ID,
		feeConfigId: 1,
		expectedAmount: p.expectedAmount,
		paidAmount: p.status === 'PAID' ? p.expectedAmount : null,
		status: p.status,
		paymentDate: p.status === 'PAID' ? new Date(PERIOD_YEAR, PERIOD_MONTH - 1, 10) : null,
		approvedBy: null,
		notes: null,
		dueDate: p.dueDate ?? dueDateForCutoff,
		createdAt: new Date(),
	}))

	const enrollments = setup.enrollments.map((e) => ({
		id: e.id,
		studentId: STUDENT_ID,
		classId: e.classId,
		isActive: e.isActive,
		paymentCutoffDay: e.cutoff ?? CUTOFF_DAY,
		monthlyFee: e.monthlyFee ?? setup.feeAmount,
		enrolledAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
		danceClass: { id: e.classId, name: e.name, sport: e.sport },
	}))

	return {
		payments,
		periods: [
			{
				id: PERIOD_ID,
				year: PERIOD_YEAR,
				month: PERIOD_MONTH,
				name: 'Junio 2026',
				dueDate: null,
				isActive: true,
			},
		],
		students: [{ id: STUDENT_ID, isActive: true, name: 'Alumno Test', hasDebt: false, enrollmentData: null }],
		danceClasses,
		feeConfigs: [
			{ id: 1, isActive: true, sport: 'DANCE', amount: setup.feeAmount, validFrom: new Date('2000-01-01'), validUntil: null },
			{ id: 2, isActive: true, sport: 'VOLLEYBALL', amount: setup.feeAmount, validFrom: new Date('2000-01-01'), validUntil: null },
		],
		enrollments,
		transfers: setup.transfers.map((t) => ({ ...t, studentId: STUDENT_ID })),
		receipts: [],
		_seq: {
			payment: payments.reduce((m, p) => Math.max(m, p.id), 0),
			receipt: 0,
			feeConfig: 2,
		},
	}
}

const paymentsFor = (db: any, classId: number) =>
	db.payments.filter((p: any) => p.studentId === STUDENT_ID && p.classId === classId && p.periodId === PERIOD_ID)

const pendingFor = (db: any, classId: number) => paymentsFor(db, classId).filter((p: any) => p.status === 'PENDING')

const beforePeriodDate = fc.integer({ min: 1, max: 60 }).map((daysBefore) => {
	const d = new Date(PERIOD_START.getTime())
	d.setDate(d.getDate() - daysBefore)
	return d
})

const expectedAmountArb = fc.integer({ min: 10, max: 200 }).map((n) => n * 1000)

/**
 * E1 - Real-data shape (transferencia previa al periodo, multiclase distinto deporte).
 * Setup fijo: classId 4 BAILE activa, classId 62 VOLEIBOL activa, classId 41 BAILE
 * inactiva. Transferencia 41 -> 4 con transferredAt < periodStart. PAID en classId 41
 * en el periodo 27.
 *
 * Property 1 (Bug Condition): para todo expectedAmount en [10000..200000] y todo
 * transferredAt anterior al inicio del periodo, tras generateMonthlyPayments(27, false):
 *   - NO existe nuevo monthly_payment para (S1, 4, 27): la cadena 41 -> 4 cubre el
 *     principal de BAILE.
 *   - Existe exactamente UN monthly_payment PENDING para (S1, 62, 27) con dueDate
 *     dia 20 de Junio (cutoff 15) y expectedAmount derivado de la inscripcion activa.
 *   - El PAID en classId 41 queda intocado.
 *
 * Counterexample esperado sobre codigo SIN fix: NO se crea PENDING para classId 62
 * (la heuristica gruesa lo cubre con el PAID de la clase 41 sin cadena hacia 62).
 */
describe('Tarea 1 - E1: transferencia previa al periodo, multiclase distinto deporte (debe FALLAR sin fix)', () => {
	const buildE1 = (expected: number, transferredAt: Date): Setup => ({
		feeAmount: expected,
		enrollments: [
			{ id: 1522, classId: 4, isActive: true, sport: 'DANCE', name: 'Martes y jueves 3:30 PM' },
			{ id: 1145, classId: 41, isActive: false, sport: 'DANCE', name: 'Miercoles y viernes 3:30 PM' },
			{ id: 1148, classId: 62, isActive: true, sport: 'VOLLEYBALL', name: 'Voleibol Martes/Jueves/Sabado' },
		],
		payments: [{ id: 7340, classId: 41, status: 'PAID', expectedAmount: expected }],
		transfers: [{ id: 1, fromClassId: 41, toClassId: 4, transferredAt }],
	})

	test('property: PENDING para classId 62 creado y PAID en classId 41 intocado', async () => {
		await fc.assert(
			fc.asyncProperty(expectedAmountArb, beforePeriodDate, async (expected, transferredAt) => {
				const db = buildDb(buildE1(expected, transferredAt))
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

				expect(paymentsFor(db, 4).filter((p: any) => p.status === 'PENDING')).toHaveLength(0)

				const pendingsFor62 = pendingFor(db, 62)
				expect(pendingsFor62).toHaveLength(1)
				expect(pendingsFor62[0].expectedAmount).toBe(expected)
				const due = pendingsFor62[0].dueDate as Date
				expect(due.getMonth()).toBe(PERIOD_MONTH - 1)
				expect(due.getDate()).toBe(20)

				const paid41 = db.payments.find((p: any) => p.id === 7340)
				expect(paid41.status).toBe('PAID')
				expect(paid41.expectedAmount).toBe(expected)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: estudiante 1035981674-like, classId 62 recibe PENDING tras generateMonthlyPayments', async () => {
		const transferredAt = new Date(2026, 4, 15) // 15 de Mayo de 2026, anterior al periodStart Junio
		const db = buildDb(buildE1(70000, transferredAt))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

		const pendingsFor62 = pendingFor(db, 62)
		expect(pendingsFor62).toHaveLength(1)
		expect(pendingsFor62[0].expectedAmount).toBe(70000)
		expect(paymentsFor(db, 4).filter((p: any) => p.status === 'PENDING')).toHaveLength(0)
		const paid41 = db.payments.find((p: any) => p.id === 7340)
		expect(paid41.status).toBe('PAID')
		expect(paid41.expectedAmount).toBe(70000)
	})
})

/**
 * E2 - Multiclase mismo deporte sin transferencia.
 * Setup: classes A y B activas (ambas BAILE), clase C inactiva con PAID en el periodo,
 * sin rows en student_transfers.
 *
 * Property 1 (Bug Condition): para todo (A, B, C) distintos y todo expectedAmount,
 * tras generateMonthlyPayments(27, false):
 *   - Existen exactamente DOS monthly_payments PENDING, uno para A y uno para B.
 *   - El PAID en classId C queda intocado.
 *
 * Counterexample esperado sobre codigo SIN fix: ni A ni B reciben PENDING (la rama
 * else trata el PAID de C como cobertura para todas las inscripciones activas).
 */
describe('Tarea 1 - E2: multiclase mismo deporte sin transferencia (debe FALLAR sin fix)', () => {
	const buildE2 = (a: number, b: number, c: number, expected: number): Setup => ({
		feeAmount: expected,
		enrollments: [
			{ id: `E-A-${a}`, classId: a, isActive: true, sport: 'DANCE', name: `Clase A ${a}` },
			{ id: `E-B-${b}`, classId: b, isActive: true, sport: 'DANCE', name: `Clase B ${b}` },
			{ id: `E-C-${c}`, classId: c, isActive: false, sport: 'DANCE', name: `Clase C ${c}` },
		],
		payments: [{ id: 5001, classId: c, status: 'PAID', expectedAmount: expected }],
		transfers: [],
	})

	test('property: A y B reciben PENDING y PAID en C intocado', async () => {
		const triple = fc
			.tuple(fc.constantFrom(10, 11, 12), fc.constantFrom(20, 21, 22), fc.constantFrom(30, 31, 32))
			.filter(([a, b, c]) => a !== b && a !== c && b !== c)

		await fc.assert(
			fc.asyncProperty(triple, expectedAmountArb, async ([a, b, c], expected) => {
				const db = buildDb(buildE2(a, b, c, expected))
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

				expect(pendingFor(db, a)).toHaveLength(1)
				expect(pendingFor(db, b)).toHaveLength(1)

				const paidC = db.payments.find((p: any) => p.id === 5001)
				expect(paidC.status).toBe('PAID')
				expect(paidC.expectedAmount).toBe(expected)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: A=10, B=20, C=30, expected=80000 -> dos PENDING y PAID intocado', async () => {
		const db = buildDb(buildE2(10, 20, 30, 80000))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

		expect(pendingFor(db, 10)).toHaveLength(1)
		expect(pendingFor(db, 20)).toHaveLength(1)
		const paidC = db.payments.find((p: any) => p.id === 5001)
		expect(paidC.status).toBe('PAID')
	})
})

/**
 * E3 - Cadena encadenada A -> B -> C con PAID en A y solo C activa.
 * Setup: student_transfers `A -> B` y `B -> C` deterministicas (orden por
 * transferredAt asc, id asc) con transferredAt anterior al periodo. PAID en classId A
 * en el periodo. C es la unica inscripcion activa. PENDING preexistente en C.
 *
 * Property 1 (Expected Behavior reusable tras el fix): tras
 * generateMonthlyPayments(27, false):
 *   - NO existe nuevo monthly_payment para (S1, C, 27): la cadena A -> B -> C cubre
 *     el principal en A.
 *   - El PENDING preexistente en C se elimina como duplicado del principal en A.
 *   - El PAID en classId A queda intocado.
 *
 * Nota: la heuristica gruesa del codigo SIN fix produce el mismo resultado
 * accidentalmente (C es la unica activa y el PAID en A inactiva la cubre por la
 * heuristica). El test sirve como guarda de regresion una vez aplicado el fix:
 * sigue pasando porque la cadena se reconoce explicitamente, no por accidente.
 */
describe('Tarea 1 - E3: cadena A -> B -> C con PAID en A y solo C activa (puede pasar accidentalmente sin fix)', () => {
	const buildE3 = (expected: number, t1At: Date, t2At: Date): Setup => ({
		feeAmount: expected,
		enrollments: [
			{ id: 'E-C', classId: 73, isActive: true, sport: 'DANCE', name: 'Clase C' },
			{ id: 'E-B-inactive', classId: 72, isActive: false, sport: 'DANCE', name: 'Clase B' },
			{ id: 'E-A-inactive', classId: 71, isActive: false, sport: 'DANCE', name: 'Clase A' },
		],
		payments: [
			{ id: 6001, classId: 71, status: 'PAID', expectedAmount: expected },
			{ id: 6002, classId: 73, status: 'PENDING', expectedAmount: expected },
		],
		transfers: [
			{ id: 1, fromClassId: 71, toClassId: 72, transferredAt: t1At },
			{ id: 2, fromClassId: 72, toClassId: 73, transferredAt: t2At },
		],
	})

	test('property: PENDING en C eliminado, no se crea nuevo y PAID en A intocado', async () => {
		await fc.assert(
			fc.asyncProperty(expectedAmountArb, async (expected) => {
				const t1 = new Date(2026, 3, 10) // Abril 10
				const t2 = new Date(2026, 4, 10) // Mayo 10 (asc, ambos < periodStart Junio)
				const db = buildDb(buildE3(expected, t1, t2))
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

				const allForC = paymentsFor(db, 73)
				expect(allForC).toHaveLength(0)

				const paidA = db.payments.find((p: any) => p.id === 6001)
				expect(paidA.status).toBe('PAID')
				expect(paidA.expectedAmount).toBe(expected)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: cadena 71 -> 72 -> 73, PAID en 71 -> PENDING en 73 eliminado', async () => {
		const db = buildDb(buildE3(70000, new Date(2026, 3, 10), new Date(2026, 4, 10)))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

		expect(paymentsFor(db, 73)).toHaveLength(0)
		const paidA = db.payments.find((p: any) => p.id === 6001)
		expect(paidA.status).toBe('PAID')
	})
})

/**
 * E4 - Ciclo en la cadena (A -> B -> A) con clase activa unica D no relacionada.
 * Setup: student_transfers `A -> B` y `B -> A` con transferredAt anterior al periodo.
 * PAID en classId A en el periodo. Inscripcion activa unica en classId D no
 * relacionada con la cadena.
 *
 * Property 1 (Bug Condition): para toda cadena con ciclo A -> B -> A, tras
 * generateMonthlyPayments(27, false):
 *   - El traversal termina (bounded MAX_HOPS=10, cycle-safe via visited).
 *   - Existe exactamente UN monthly_payment PENDING para (S1, D, 27).
 *   - El PAID en classId A queda intocado.
 *
 * Counterexample esperado sobre codigo SIN fix: la heuristica gruesa cubre D y omite
 * la creacion del PENDING.
 */
describe('Tarea 1 - E4: ciclo A -> B -> A con clase activa D no relacionada (debe FALLAR sin fix)', () => {
	const buildE4 = (expected: number, a: number, b: number, d: number, t1At: Date, t2At: Date): Setup => ({
		feeAmount: expected,
		enrollments: [
			{ id: `E-D-${d}`, classId: d, isActive: true, sport: 'DANCE', name: `Clase D ${d}` },
			{ id: `E-A-${a}`, classId: a, isActive: false, sport: 'DANCE', name: `Clase A ${a}` },
			{ id: `E-B-${b}`, classId: b, isActive: false, sport: 'DANCE', name: `Clase B ${b}` },
		],
		payments: [{ id: 8001, classId: a, status: 'PAID', expectedAmount: expected }],
		transfers: [
			{ id: 1, fromClassId: a, toClassId: b, transferredAt: t1At },
			{ id: 2, fromClassId: b, toClassId: a, transferredAt: t2At },
		],
	})

	test('property: traversal acotado, PENDING para D creado y PAID en A intocado', async () => {
		const triple = fc
			.tuple(fc.constantFrom(15, 16, 17), fc.constantFrom(25, 26, 27), fc.constantFrom(45, 46, 47))
			.filter(([a, b, d]) => a !== b && a !== d && b !== d)

		await fc.assert(
			fc.asyncProperty(triple, expectedAmountArb, async ([a, b, d], expected) => {
				const t1 = new Date(2026, 3, 10)
				const t2 = new Date(2026, 4, 10)
				const db = buildDb(buildE4(expected, a, b, d, t1, t2))
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

				const pendingsForD = pendingFor(db, d)
				expect(pendingsForD).toHaveLength(1)
				expect(pendingsForD[0].expectedAmount).toBe(expected)

				const paidA = db.payments.find((p: any) => p.id === 8001)
				expect(paidA.status).toBe('PAID')
				expect(paidA.expectedAmount).toBe(expected)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: A=15, B=25, D=45, expected=70000 -> PENDING para D y PAID intocado', async () => {
		const db = buildDb(buildE4(70000, 15, 25, 45, new Date(2026, 3, 10), new Date(2026, 4, 10)))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

		expect(pendingFor(db, 45)).toHaveLength(1)
		const paidA = db.payments.find((p: any) => p.id === 8001)
		expect(paidA.status).toBe('PAID')
	})
})
