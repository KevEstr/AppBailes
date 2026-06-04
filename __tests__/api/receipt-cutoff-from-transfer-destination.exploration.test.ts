/**
 * @jest-environment node
 *
 * Spec: receipt-cutoff-from-transfer-destination
 * Tarea 1: Test exploratorio property-based de la Bug Condition (ANTES del fix).
 *
 * Property 1: Bug Condition - Cutoff resuelto por cadena de transferencia para
 *             inscripcion inactiva.
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5,
 *            2.6, 2.7, 2.8
 *
 * isBugCondition(X) (bugfix.md > Bug Condition / design.md > Bug Details > Bug Condition)
 * para X.action = READ_PAYMENT_CUTOFF cubre el caso en que la inscripcion
 * (studentId, classId) existe con isActive = false, hay cadena student_transfers que
 * termina en una inscripcion activa del mismo estudiante con paymentCutoffDay distinto
 * de SAFETY_NET, y resolveCutoffDay devuelve SAFETY_NET = 30 en lugar del cutoff del
 * destino activo (o DEFAULT_CUTOFF_DAY = 15 cuando ese destino tiene cutoff null).
 *
 * ESTE TEST DEBE FALLAR sobre el codigo SIN fix (al menos en E1, E2 y E4). La falla
 * confirma que el bug existe. NO se debe arreglar el test ni el codigo cuando falle:
 * la falla es la senal esperada. El mismo archivo se reutiliza tras el fix como
 * Property 1 - Expected Behavior (sub-tarea 3.2).
 *
 * Cuatro escenarios (design.md > 8.a):
 *   E1 - Real-data shape (estudiante 1035981674-like, transferencia 41 -> 4).
 *   E2 - Cadena encadenada A -> B -> C con destino activo cutoff 15.
 *   E3 - Ciclo (A -> B -> A) sin destino activo (regression guard via spy de console.warn).
 *   E4 - Inscripcion inactiva cuyo destino activo tiene paymentCutoffDay = null.
 *
 * Contraejemplos esperados sobre el codigo SIN fix:
 *   E1: resolveCutoffDay('S1', 41) retorna 30 (esperado 15 via cadena 41 -> 4).
 *   E2: resolveCutoffDay('S1', A) retorna 30 (esperado 15 via cadena A -> B -> C activa).
 *   E3: pasa accidentalmente el value-assert (30 == 30 por la rama SAFETY_NET sin
 *       recorrer la cadena), pero el spy de console.warn no captura el patron
 *       /cycle detected|inactive enrollment/ porque el codigo sin fix nunca emite ese
 *       warn (la rama actual cae directo a 30 sin recorrer student_transfers). Sobre
 *       codigo CON fix ambos asserts deben cumplirse.
 *   E4: resolveCutoffDay('S1', A) retorna 30 (esperado 15 = DEFAULT_CUTOFF_DAY via
 *       cadena A -> B activa con cutoff null).
 */

import fc from 'fast-check'

jest.mock('@/lib/prisma', () => {
	let state: any = null

	const clone = (o: any) => (o == null ? o : { ...o })

	const matchEnrollment = (e: any, where: any): boolean => {
		if (!where) return true
		if (where.studentId !== undefined && e.studentId !== where.studentId) return false
		if (where.classId !== undefined) {
			const c = where.classId
			if (c && typeof c === 'object' && Array.isArray(c.in)) {
				if (!c.in.includes(e.classId)) return false
			} else if (e.classId !== c) {
				return false
			}
		}
		if (where.isActive !== undefined && e.isActive !== where.isActive) return false
		return true
	}

	const matchTransfer = (t: any, where: any): boolean => {
		if (!where) return true
		if (where.studentId !== undefined && t.studentId !== where.studentId) return false
		if (where.fromClassId !== undefined && t.fromClassId !== where.fromClassId) return false
		if (where.toClassId !== undefined && t.toClassId !== where.toClassId) return false
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

	const project = (row: any, select: any) => {
		if (!select || !row) return clone(row)
		const out: any = {}
		Object.keys(select).forEach((k) => {
			if (select[k]) out[k] = row[k]
		})
		return out
	}

	const prisma: any = {
		classEnrollment: {
			findFirst: jest.fn(async ({ where, select }: any) => {
				const match = (state.enrollments ?? []).find((e: any) => matchEnrollment(e, where))
				if (!match) return null
				return select ? project(match, select) : clone(match)
			}),
			findMany: jest.fn(async ({ where, select }: any) => {
				const matches = (state.enrollments ?? []).filter((e: any) => matchEnrollment(e, where))
				return matches.map((m: any) => (select ? project(m, select) : clone(m)))
			}),
		},
		studentTransfer: {
			findMany: jest.fn(async ({ where, orderBy, select }: any) => {
				const matches = (state.transfers ?? []).filter((t: any) => matchTransfer(t, where))
				const sorted = sortBy(matches, orderBy)
				return sorted.map((m: any) => (select ? project(m, select) : clone(m)))
			}),
			findFirst: jest.fn(async () => null),
		},
		__setDb: (db: any) => {
			state = db
		},
	}

	return { prisma }
})

import { resolveCutoffDay } from '@/lib/payment-utils'
import { prisma } from '@/lib/prisma'

const prismaMock = prisma as any

const STUDENT_ID = 'S1'

type EnrollmentSeed = {
	id: number
	studentId?: string
	classId: number
	isActive: boolean
	paymentCutoffDay: number | null
}

type TransferSeed = {
	id: number
	studentId?: string
	fromClassId: number
	toClassId: number
	transferredAt: Date
}

function setDb(enrollments: EnrollmentSeed[], transfers: TransferSeed[]) {
	prismaMock.__setDb({
		enrollments: enrollments.map((e) => ({ studentId: STUDENT_ID, ...e })),
		transfers: transfers.map((t) => ({ studentId: STUDENT_ID, ...t })),
	})
}

// Generador de transferredAt anclado al 15 de Mayo de 2026 con offset en dias para
// cubrir antes/dentro/despues del periodo notional. La travesia ignora transferredAt;
// la propiedad debe sostenerse para todo offset (design.md > 8.a, clausula 2.6).
const transferredAtArb = fc.integer({ min: -120, max: 120 }).map((daysFromAnchor) => {
	const d = new Date(2026, 4, 15)
	d.setDate(d.getDate() + daysFromAnchor)
	return d
})

describe('Tarea 1 - E1: real-data shape (estudiante 1035981674-like) - debe FALLAR sin fix', () => {
	const buildE1 = (transferredAt: Date) => ({
		enrollments: [
			{ id: 1522, classId: 4, isActive: true, paymentCutoffDay: 15 },
			{ id: 1145, classId: 41, isActive: false, paymentCutoffDay: 15 },
			{ id: 1148, classId: 62, isActive: true, paymentCutoffDay: 15 },
		] as EnrollmentSeed[],
		transfers: [{ id: 1, fromClassId: 41, toClassId: 4, transferredAt }] as TransferSeed[],
	})

	test('property: resolveCutoffDay(S1, 41) === 15 para todo transferredAt (cadena ignora orden temporal)', async () => {
		await fc.assert(
			fc.asyncProperty(transferredAtArb, async (transferredAt) => {
				const { enrollments, transfers } = buildE1(transferredAt)
				setDb(enrollments, transfers)
				const result = await resolveCutoffDay(STUDENT_ID, 41)
				expect(result).toBe(15)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: transferredAt = 2026-05-15 -> resolveCutoffDay(S1, 41) === 15', async () => {
		const { enrollments, transfers } = buildE1(new Date(2026, 4, 15))
		setDb(enrollments, transfers)
		const result = await resolveCutoffDay(STUDENT_ID, 41)
		expect(result).toBe(15)
	})
})

describe('Tarea 1 - E2: cadena A -> B -> C con destino activo cutoff 15 - debe FALLAR sin fix', () => {
	const A = 100
	const B = 200
	const C = 300

	const buildE2 = (t1: Date, t2: Date) => ({
		enrollments: [
			{ id: 1, classId: A, isActive: false, paymentCutoffDay: 30 },
			{ id: 2, classId: B, isActive: false, paymentCutoffDay: null },
			{ id: 3, classId: C, isActive: true, paymentCutoffDay: 15 },
		] as EnrollmentSeed[],
		transfers: [
			{ id: 1, fromClassId: A, toClassId: B, transferredAt: t1 },
			{ id: 2, fromClassId: B, toClassId: C, transferredAt: t2 },
		] as TransferSeed[],
	})

	test('property: resolveCutoffDay(S1, A) === 15 para toda cadena ordenada A -> B -> C', async () => {
		await fc.assert(
			fc.asyncProperty(transferredAtArb, transferredAtArb, async (a1, a2) => {
				const t1 = a1.getTime() <= a2.getTime() ? a1 : a2
				const t2 = a1.getTime() <= a2.getTime() ? a2 : a1
				const { enrollments, transfers } = buildE2(t1, t2)
				setDb(enrollments, transfers)
				const result = await resolveCutoffDay(STUDENT_ID, A)
				expect(result).toBe(15)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: A=100, B=200, C=300 con cadena A -> B -> C activa con cutoff 15', async () => {
		const { enrollments, transfers } = buildE2(new Date(2026, 3, 1), new Date(2026, 4, 10))
		setDb(enrollments, transfers)
		const result = await resolveCutoffDay(STUDENT_ID, A)
		expect(result).toBe(15)
	})
})

describe('Tarea 1 - E3: ciclo A -> B -> A sin destino activo (regression guard via console.warn)', () => {
	const A = 1000
	const B = 2000

	const buildE3 = (t1: Date, t2: Date) => ({
		enrollments: [
			{ id: 1, classId: A, isActive: false, paymentCutoffDay: 30 },
			{ id: 2, classId: B, isActive: false, paymentCutoffDay: 30 },
		] as EnrollmentSeed[],
		transfers: [
			{ id: 1, fromClassId: A, toClassId: B, transferredAt: t1 },
			{ id: 2, fromClassId: B, toClassId: A, transferredAt: t2 },
		] as TransferSeed[],
	})

	test('property: resolveCutoffDay(S1, A) === 30 y console.warn captura ciclo / inscripcion inactiva', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			await fc.assert(
				fc.asyncProperty(transferredAtArb, transferredAtArb, async (a1, a2) => {
					const t1 = a1.getTime() <= a2.getTime() ? a1 : a2
					const t2 = a1.getTime() <= a2.getTime() ? a2 : a1
					warnSpy.mockClear()
					const { enrollments, transfers } = buildE3(t1, t2)
					setDb(enrollments, transfers)

					const result = await resolveCutoffDay(STUDENT_ID, A)
					expect(result).toBe(30)

					// Sobre codigo CON fix DEBE emitir warn que matchee el patron de
					// ciclo o de inscripcion inactiva sin destino activo. Sobre codigo
					// SIN fix esta asercion fallara: la rama SAFETY_NET indiscriminada
					// nunca emite ese warn (cae a 30 sin recorrer student_transfers).
					const calls = warnSpy.mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : '')).join(' '))
					expect(calls.some((s) => /cycle detected|inactive enrollment/.test(s))).toBe(true)
				}),
				{ numRuns: 50 },
			)
		} finally {
			warnSpy.mockRestore()
		}
	})
})

describe('Tarea 1 - E4: inactiva con destino activo cutoff null -> DEFAULT_CUTOFF_DAY = 15 - debe FALLAR sin fix', () => {
	const A = 5000
	const B = 6000

	const buildE4 = (transferredAt: Date) => ({
		enrollments: [
			{ id: 1, classId: A, isActive: false, paymentCutoffDay: 30 },
			{ id: 2, classId: B, isActive: true, paymentCutoffDay: null },
		] as EnrollmentSeed[],
		transfers: [{ id: 1, fromClassId: A, toClassId: B, transferredAt }] as TransferSeed[],
	})

	test('property: resolveCutoffDay(S1, A) === 15 (DEFAULT_CUTOFF_DAY) para todo transferredAt', async () => {
		await fc.assert(
			fc.asyncProperty(transferredAtArb, async (transferredAt) => {
				const { enrollments, transfers } = buildE4(transferredAt)
				setDb(enrollments, transfers)
				const result = await resolveCutoffDay(STUDENT_ID, A)
				expect(result).toBe(15)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: cadena A -> B activa con cutoff null -> 15', async () => {
		const { enrollments, transfers } = buildE4(new Date(2026, 4, 15))
		setDb(enrollments, transfers)
		const result = await resolveCutoffDay(STUDENT_ID, A)
		expect(result).toBe(15)
	})
})
