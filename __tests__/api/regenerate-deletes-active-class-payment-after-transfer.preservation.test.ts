/**
 * @jest-environment node
 *
 * Spec: regenerate-deletes-active-class-payment-after-transfer
 * Tarea 2: Tests de preservacion property-based (ANTES del fix, observation-first).
 *
 * Property 2: Preservation - Comportamiento intacto fuera de la condicion de bug.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 *
 * Cubre los cinco escenarios P1-P5 descritos en design.md > 8.b:
 *   P1 - Unica clase activa, sin transferencia, sin PAID en inactivas (clausulas 3.1, 3.7).
 *   P2 - regenerate=true con PARTIAL_PAID + remaining PENDING (clausula 3.4).
 *   P3 - Limpieza de huerfanos: PENDING/OVERDUE eliminados, PAID/PARTIAL_PAID preservados
 *        (clausulas 3.5, 3.6).
 *   P4 - PAID/PARTIAL_PAID intocados a traves de regeneraciones (clausula 3.6, invariante I3).
 *   P5 - Transferencia intra-periodo consolida principal en origen (clausula 3.2).
 *
 * METODOLOGIA OBSERVATION-FIRST: las aserciones reflejan el comportamiento real del codigo
 * SIN fix sobre inputs ¬C(X). Todos los tests DEBEN PASAR sobre el codigo sin modificar.
 * Tras el fix se reutilizan en la sub-tarea 3.3 para garantizar que no hay regresiones en
 * los flujos de preservacion.
 */

import fc from 'fast-check'

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
const PERIOD_MONTH = 6
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

	const payments = setup.payments.map((p) => ({
		id: p.id,
		studentId: STUDENT_ID,
		classId: p.classId,
		periodId: PERIOD_ID,
		feeConfigId: 1,
		expectedAmount: p.expectedAmount,
		paidAmount: p.status === 'PAID' ? p.expectedAmount : p.status === 'PARTIAL_PAID' ? Math.floor(p.expectedAmount / 2) : null,
		status: p.status,
		paymentDate: p.status === 'PAID' || p.status === 'PARTIAL_PAID' ? new Date(PERIOD_YEAR, PERIOD_MONTH - 1, 10) : null,
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

const pendingFor = (db: any, classId: number) =>
	paymentsFor(db, classId).filter((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE')

const expectedAmountArb = fc.integer({ min: 10, max: 200 }).map((n) => n * 1000)

const intraPeriodDate = fc.integer({ min: 1, max: 30 }).map((day) => new Date(PERIOD_YEAR, PERIOD_MONTH - 1, day, 12, 0, 0))

/**
 * P1 - Unica clase activa, sin transferencia, sin PAID en inactivas.
 * Validates: Requirements 3.1, 3.7
 *
 * Property 2 (Preservation): para todo classId activo y todo expectedAmount,
 * tras ejecutar generateMonthlyPayments DOS veces (idempotencia, invariante I4):
 *   - Existe exactamente UN monthly_payment PENDING para (S1, classId, periodId).
 *   - expectedAmount = monthlyFee resuelto.
 *   - dueDate consistente con paymentCutoffDay 15 -> dia 20 del mes del periodo.
 */
describe('Tarea 2 - P1: unica clase activa sin transferencia y sin PAID en inactivas (debe PASAR sin fix)', () => {
	const buildP1 = (classId: number, expected: number): Setup => ({
		feeAmount: expected,
		enrollments: [{ id: `E-${classId}`, classId, isActive: true, sport: 'DANCE', name: `Clase ${classId}` }],
		payments: [],
		transfers: [],
	})

	test('property: idempotencia tras dos ejecuciones, un PENDING con expectedAmount y dueDate correctos', async () => {
		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 50 }), expectedAmountArb, async (classId, expected) => {
				const db = buildDb(buildP1(classId, expected))
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)
				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

				const pendings = pendingFor(db, classId)
				expect(pendings).toHaveLength(1)
				expect(pendings[0].expectedAmount).toBe(expected)
				const due = pendings[0].dueDate as Date
				expect(due.getFullYear()).toBe(PERIOD_YEAR)
				expect(due.getMonth()).toBe(PERIOD_MONTH - 1)
				expect(due.getDate()).toBe(20)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: classId 4 con feeAmount 70000 -> un PENDING con expectedAmount 70000 y dueDate dia 20', async () => {
		const db = buildDb(buildP1(4, 70000))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)
		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

		const pendings = pendingFor(db, 4)
		expect(pendings).toHaveLength(1)
		expect(pendings[0].expectedAmount).toBe(70000)
		expect((pendings[0].dueDate as Date).getDate()).toBe(20)
	})
})

/**
 * P2 - regenerate=true con PARTIAL_PAID + remaining PENDING para la misma terna.
 * Validates: Requirements 3.4
 *
 * Property 2 (Preservation): para todo principalAmount y todo remainingAmount sobre la
 * misma terna (S1, classId, periodId), tras generateMonthlyPayments(periodId, true):
 *   - El PARTIAL_PAID conserva su status y expectedAmount.
 *   - El restante PENDING conserva su expectedAmount (NO se sobreescribe con la
 *     mensualidad completa). Idempotencia introducida por partial-payment-remaining-amount-fix.
 */
describe('Tarea 2 - P2: regenerate=true con PARTIAL_PAID y restante PENDING (debe PASAR sin fix)', () => {
	const buildP2 = (classId: number, principalAmount: number, remainingAmount: number): Setup => ({
		feeAmount: principalAmount,
		enrollments: [{ id: `E-${classId}`, classId, isActive: true, sport: 'DANCE', name: `Clase ${classId}` }],
		payments: [
			{ id: 9001, classId, status: 'PARTIAL_PAID', expectedAmount: principalAmount },
			{ id: 9002, classId, status: 'PENDING', expectedAmount: remainingAmount },
		],
		transfers: [],
	})

	test('property: PARTIAL_PAID y restante PENDING conservan expectedAmount tras regenerate=true', async () => {
		const principalArb = fc.integer({ min: 50, max: 100 }).map((n) => n * 1000)
		const remainingArb = fc.integer({ min: 5, max: 30 }).map((n) => n * 1000)

		await fc.assert(
			fc.asyncProperty(fc.integer({ min: 1, max: 50 }), principalArb, remainingArb, async (classId, principal, remaining) => {
				const db = buildDb(buildP2(classId, principal, remaining))
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, true)

				const partial = db.payments.find((p: any) => p.id === 9001)
				expect(partial.status).toBe('PARTIAL_PAID')
				expect(partial.expectedAmount).toBe(principal)

				const pending = db.payments.find((p: any) => p.id === 9002)
				expect(pending).toBeDefined()
				expect(pending.status).toBe('PENDING')
				expect(pending.expectedAmount).toBe(remaining)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: PARTIAL_PAID 75000 + remaining PENDING 17000 con regenerate=true', async () => {
		const db = buildDb(buildP2(4, 75000, 17000))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, true)

		const partial = db.payments.find((p: any) => p.id === 9001)
		expect(partial.status).toBe('PARTIAL_PAID')
		expect(partial.expectedAmount).toBe(75000)

		const pending = db.payments.find((p: any) => p.id === 9002)
		expect(pending.status).toBe('PENDING')
		expect(pending.expectedAmount).toBe(17000)
	})
})

/**
 * P3 - Limpieza de huerfanos al final del bucle del estudiante.
 * Validates: Requirements 3.5, 3.6
 *
 * Property 2 (Preservation): para todo classId huerfano (NO en activeClassIds del
 * estudiante) y todo status:
 *   - PENDING/OVERDUE: el monthly_payment es eliminado por la limpieza de huerfanos.
 *   - PAID/PARTIAL_PAID: el monthly_payment NUNCA se elimina (invariante I3).
 */
describe('Tarea 2 - P3: limpieza de huerfanos elimina PENDING/OVERDUE y preserva PAID/PARTIAL_PAID (debe PASAR sin fix)', () => {
	const buildP3 = (
		activeClassId: number,
		orphanClassId: number,
		orphanStatus: 'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIAL_PAID',
		expected: number,
	): Setup => ({
		feeAmount: expected,
		enrollments: [{ id: `E-active-${activeClassId}`, classId: activeClassId, isActive: true, sport: 'DANCE', name: `Clase activa ${activeClassId}` }],
		payments: [{ id: 4001, classId: orphanClassId, status: orphanStatus, expectedAmount: expected }],
		transfers: [],
	})

	test('property: PENDING/OVERDUE huerfano eliminado, PAID/PARTIAL_PAID preservado', async () => {
		const classPair = fc
			.tuple(fc.integer({ min: 1, max: 25 }), fc.integer({ min: 26, max: 50 }))
			.filter(([a, o]) => a !== o)
		const statusArb = fc.constantFrom<'PENDING' | 'OVERDUE' | 'PAID' | 'PARTIAL_PAID'>(
			'PENDING',
			'OVERDUE',
			'PAID',
			'PARTIAL_PAID',
		)

		await fc.assert(
			fc.asyncProperty(classPair, statusArb, expectedAmountArb, async ([activeId, orphanId], status, expected) => {
				const db = buildDb(buildP3(activeId, orphanId, status, expected))
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

				const orphan = db.payments.find((p: any) => p.id === 4001)
				if (status === 'PENDING' || status === 'OVERDUE') {
					expect(orphan).toBeUndefined()
					return
				}
				expect(orphan).toBeDefined()
				expect(orphan.status).toBe(status)
				expect(orphan.expectedAmount).toBe(expected)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: PENDING huerfano para classId 99 -> eliminado', async () => {
		const db = buildDb(buildP3(4, 99, 'PENDING', 70000))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

		expect(db.payments.find((p: any) => p.id === 4001)).toBeUndefined()
	})

	test('caso concreto: PAID huerfano para classId 99 -> preservado', async () => {
		const db = buildDb(buildP3(4, 99, 'PAID', 70000))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

		const orphan = db.payments.find((p: any) => p.id === 4001)
		expect(orphan).toBeDefined()
		expect(orphan.status).toBe('PAID')
		expect(orphan.expectedAmount).toBe(70000)
	})
})

/**
 * P4 - PAID/PARTIAL_PAID intocados a traves de regeneraciones.
 * Validates: Requirements 3.6 (invariante I3)
 *
 * Property 2 (Preservation): para toda configuracion con PAID y PARTIAL_PAID en clases
 * inactivas del estudiante y toda eleccion de regenerate (true|false), tras
 * generateMonthlyPayments:
 *   - Ningun PAID cambia status, expectedAmount o dueDate.
 *   - Ningun PARTIAL_PAID cambia status, expectedAmount o dueDate.
 *
 * Setup: PAID y PARTIAL_PAID viven en clases inactivas (no procesadas en el bucle por
 * inscripcion activa, no eliminadas por orphan cleanup). Hay una inscripcion activa
 * adicional para forzar la ejecucion completa de la rutina.
 */
describe('Tarea 2 - P4: PAID y PARTIAL_PAID intocados a traves de regeneraciones (debe PASAR sin fix)', () => {
	const buildP4 = (
		activeClassId: number,
		paidClassId: number,
		partialClassId: number,
		paidAmount: number,
		partialAmount: number,
		feeAmount: number,
	): Setup => ({
		feeAmount,
		enrollments: [
			{ id: `E-active-${activeClassId}`, classId: activeClassId, isActive: true, sport: 'DANCE', name: `Clase activa ${activeClassId}` },
		],
		payments: [
			{ id: 3001, classId: paidClassId, status: 'PAID', expectedAmount: paidAmount },
			{ id: 3002, classId: partialClassId, status: 'PARTIAL_PAID', expectedAmount: partialAmount },
		],
		transfers: [],
	})

	test('property: status, expectedAmount y dueDate de PAID/PARTIAL_PAID se preservan', async () => {
		const triple = fc
			.tuple(fc.integer({ min: 1, max: 20 }), fc.integer({ min: 21, max: 35 }), fc.integer({ min: 36, max: 50 }))
			.filter(([a, b, c]) => a !== b && a !== c && b !== c)

		await fc.assert(
			fc.asyncProperty(
				triple,
				expectedAmountArb,
				expectedAmountArb,
				expectedAmountArb,
				fc.boolean(),
				async ([activeId, paidId, partialId], paidAmount, partialAmount, feeAmount, regenerate) => {
					const db = buildDb(buildP4(activeId, paidId, partialId, paidAmount, partialAmount, feeAmount))
					prismaMock.__setDb(db)

					const paidBefore = clonePayment(db, 3001)
					const partialBefore = clonePayment(db, 3002)

					await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, regenerate)

					const paidAfter = db.payments.find((p: any) => p.id === 3001)
					expect(paidAfter).toBeDefined()
					expect(paidAfter.status).toBe('PAID')
					expect(paidAfter.expectedAmount).toBe(paidBefore.expectedAmount)
					expect((paidAfter.dueDate as Date).getTime()).toBe((paidBefore.dueDate as Date).getTime())

					const partialAfter = db.payments.find((p: any) => p.id === 3002)
					expect(partialAfter).toBeDefined()
					expect(partialAfter.status).toBe('PARTIAL_PAID')
					expect(partialAfter.expectedAmount).toBe(partialBefore.expectedAmount)
					expect((partialAfter.dueDate as Date).getTime()).toBe((partialBefore.dueDate as Date).getTime())
				},
			),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: PAID 70000 y PARTIAL_PAID 60000 con regenerate=true preservados', async () => {
		const db = buildDb(buildP4(4, 41, 42, 70000, 60000, 80000))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, true)

		const paid = db.payments.find((p: any) => p.id === 3001)
		expect(paid.status).toBe('PAID')
		expect(paid.expectedAmount).toBe(70000)

		const partial = db.payments.find((p: any) => p.id === 3002)
		expect(partial.status).toBe('PARTIAL_PAID')
		expect(partial.expectedAmount).toBe(60000)
	})
})

function clonePayment(db: any, id: number) {
	const row = db.payments.find((p: any) => p.id === id)
	return { ...row, dueDate: new Date((row.dueDate as Date).getTime()) }
}

/**
 * P5 - Transferencia intra-periodo consolida principal en origen.
 * Validates: Requirements 3.2
 *
 * Property 2 (Preservation): para toda transferencia con
 * periodStart <= transferredAt < periodEnd, fromClassId C, toClassId A activa, PAID en
 * classId C en el periodo y PENDING preexistente en A:
 *   - NO se crea nuevo monthly_payment para (S1, A, periodId).
 *   - El PENDING preexistente en A se elimina como duplicado del principal.
 *   - El PAID en classId C queda intocado (status, expectedAmount).
 */
describe('Tarea 2 - P5: transferencia intra-periodo consolida principal en origen (debe PASAR sin fix)', () => {
	const buildP5 = (
		fromClassId: number,
		toClassId: number,
		expected: number,
		transferredAt: Date,
	): Setup => ({
		feeAmount: expected,
		enrollments: [
			{ id: `E-to-${toClassId}`, classId: toClassId, isActive: true, sport: 'DANCE', name: `Clase destino ${toClassId}` },
			{ id: `E-from-${fromClassId}`, classId: fromClassId, isActive: false, sport: 'DANCE', name: `Clase origen ${fromClassId}` },
		],
		payments: [
			{ id: 2001, classId: fromClassId, status: 'PAID', expectedAmount: expected },
			{ id: 2002, classId: toClassId, status: 'PENDING', expectedAmount: expected },
		],
		transfers: [{ id: 1, fromClassId, toClassId, transferredAt }],
	})

	test('property: PENDING en destino eliminado, sin nuevo pago en destino, PAID en origen intocado', async () => {
		const pair = fc
			.tuple(fc.integer({ min: 1, max: 25 }), fc.integer({ min: 26, max: 50 }))
			.filter(([f, t]) => f !== t)

		await fc.assert(
			fc.asyncProperty(pair, expectedAmountArb, intraPeriodDate, async ([fromId, toId], expected, transferredAt) => {
				const db = buildDb(buildP5(fromId, toId, expected, transferredAt))
				prismaMock.__setDb(db)

				await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

				const paymentsForTo = paymentsFor(db, toId)
				expect(paymentsForTo).toHaveLength(0)

				const paid = db.payments.find((p: any) => p.id === 2001)
				expect(paid).toBeDefined()
				expect(paid.status).toBe('PAID')
				expect(paid.expectedAmount).toBe(expected)
				expect(paid.classId).toBe(fromId)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: transferencia 41 -> 4 dentro del periodo, PAID 70000 intocado y PENDING en 4 eliminado', async () => {
		const db = buildDb(buildP5(41, 4, 70000, new Date(PERIOD_YEAR, PERIOD_MONTH - 1, 10, 12, 0, 0)))
		prismaMock.__setDb(db)

		await monthlyPaymentService.generateMonthlyPayments(PERIOD_ID, false)

		expect(paymentsFor(db, 4)).toHaveLength(0)
		const paid = db.payments.find((p: any) => p.id === 2001)
		expect(paid.status).toBe('PAID')
		expect(paid.expectedAmount).toBe(70000)
	})
})
