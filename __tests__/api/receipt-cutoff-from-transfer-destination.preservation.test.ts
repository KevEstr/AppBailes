/**
 * @jest-environment node
 *
 * Spec: receipt-cutoff-from-transfer-destination
 * Tarea 2: Tests de preservacion property-based (ANTES del fix, observation-first).
 *
 * Property 2: Preservation - Comportamiento intacto fuera de la condicion de bug.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.8
 *
 * Metodologia observation-first (design.md > 8.b): se ejecuta el codigo SIN fix sobre
 * inputs ¬C(X), se observa la salida real, y se asertan property-based tests sobre esa
 * salida observada. Esto fija la baseline a preservar para la sub-tarea 3.3.
 *
 * Cinco casos (design.md > 8.b):
 *   P1 - Inscripcion activa con cutoff D en [1..31].
 *   P2 - Inscripcion activa con paymentCutoffDay = null -> DEFAULT_CUTOFF_DAY = 15.
 *   P3 - Sin inscripcion alguna para la terna -> SAFETY_NET_CUTOFF_DAY = 30.
 *   P4 - classId == null con (a) activa cutoff D, (b) activa cutoff null,
 *        (c) sin activas; emite console.warn en todos los sub-casos.
 *   P5 - Inscripcion activa con cadena saliente anomala (clausula 3.8): activa gana.
 *
 * EXPECTED OUTCOME: TODOS los tests PASAN sobre el codigo SIN fix. Si alguno fallara,
 * la asercion seria mas estricta que el comportamiento real y debe relajarse.
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
const DEFAULT_CUTOFF_DAY = 15
const SAFETY_NET_CUTOFF_DAY = 30

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

const classIdArb = fc.constantFrom(10, 20, 30, 40, 50, 60, 70, 80, 90, 100)
const cutoffArb = fc.integer({ min: 1, max: 31 })
const transferredAtArb = fc.integer({ min: -120, max: 120 }).map((daysFromAnchor) => {
	const d = new Date(2026, 4, 15)
	d.setDate(d.getDate() + daysFromAnchor)
	return d
})

describe('Tarea 2 - P1: inscripcion activa con cutoff D en [1..31] -> retorna D (clausula 3.1)', () => {
	test('property: forall D in [1..31] y classId, resolveCutoffDay retorna D', async () => {
		await fc.assert(
			fc.asyncProperty(cutoffArb, classIdArb, async (D, classId) => {
				setDb([{ id: 1, classId, isActive: true, paymentCutoffDay: D }], [])
				const result = await resolveCutoffDay(STUDENT_ID, classId)
				expect(result).toBe(D)
			}),
			{ numRuns: 50 },
		)
	})

	test('property: studentTransfers irrelevantes cuando hay activa directa', async () => {
		await fc.assert(
			fc.asyncProperty(cutoffArb, classIdArb, classIdArb, transferredAtArb, async (D, classId, otherId, t) => {
				fc.pre(otherId !== classId)
				setDb(
					[{ id: 1, classId, isActive: true, paymentCutoffDay: D }],
					[{ id: 1, fromClassId: classId, toClassId: otherId, transferredAt: t }],
				)
				const result = await resolveCutoffDay(STUDENT_ID, classId)
				expect(result).toBe(D)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: D=15, classId=42 -> 15', async () => {
		setDb([{ id: 1, classId: 42, isActive: true, paymentCutoffDay: 15 }], [])
		const result = await resolveCutoffDay(STUDENT_ID, 42)
		expect(result).toBe(15)
	})

	test('caso concreto: D=30, classId=99 -> 30', async () => {
		setDb([{ id: 1, classId: 99, isActive: true, paymentCutoffDay: 30 }], [])
		const result = await resolveCutoffDay(STUDENT_ID, 99)
		expect(result).toBe(30)
	})
})

describe('Tarea 2 - P2: inscripcion activa con cutoff null -> DEFAULT_CUTOFF_DAY = 15 (clausula 3.2)', () => {
	test('property: forall classId, resolveCutoffDay retorna 15 cuando paymentCutoffDay = null', async () => {
		await fc.assert(
			fc.asyncProperty(classIdArb, async (classId) => {
				setDb([{ id: 1, classId, isActive: true, paymentCutoffDay: null }], [])
				const result = await resolveCutoffDay(STUDENT_ID, classId)
				expect(result).toBe(DEFAULT_CUTOFF_DAY)
			}),
			{ numRuns: 50 },
		)
	})

	test('property: cutoff null + cadena saliente irrelevante', async () => {
		await fc.assert(
			fc.asyncProperty(classIdArb, classIdArb, transferredAtArb, async (classId, otherId, t) => {
				fc.pre(otherId !== classId)
				setDb(
					[{ id: 1, classId, isActive: true, paymentCutoffDay: null }],
					[{ id: 1, fromClassId: classId, toClassId: otherId, transferredAt: t }],
				)
				const result = await resolveCutoffDay(STUDENT_ID, classId)
				expect(result).toBe(DEFAULT_CUTOFF_DAY)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: classId=42, cutoff null -> 15', async () => {
		setDb([{ id: 1, classId: 42, isActive: true, paymentCutoffDay: null }], [])
		const result = await resolveCutoffDay(STUDENT_ID, 42)
		expect(result).toBe(DEFAULT_CUTOFF_DAY)
	})
})

describe('Tarea 2 - P3: sin inscripcion para la terna -> SAFETY_NET = 30 (clausula 3.3)', () => {
	test('property: forall classId sin enrollment, resolveCutoffDay retorna 30', async () => {
		await fc.assert(
			fc.asyncProperty(classIdArb, async (classId) => {
				setDb([], [])
				const result = await resolveCutoffDay(STUDENT_ID, classId)
				expect(result).toBe(SAFETY_NET_CUTOFF_DAY)
			}),
			{ numRuns: 50 },
		)
	})

	test('property: otras inscripciones del estudiante NO afectan el resultado para la terna ausente', async () => {
		await fc.assert(
			fc.asyncProperty(classIdArb, classIdArb, cutoffArb, async (targetId, otherId, D) => {
				fc.pre(otherId !== targetId)
				setDb([{ id: 1, classId: otherId, isActive: true, paymentCutoffDay: D }], [])
				const result = await resolveCutoffDay(STUDENT_ID, targetId)
				expect(result).toBe(SAFETY_NET_CUTOFF_DAY)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: estudiante sin inscripcion para classId=42 -> 30', async () => {
		setDb([], [])
		const result = await resolveCutoffDay(STUDENT_ID, 42)
		expect(result).toBe(SAFETY_NET_CUTOFF_DAY)
	})
})

describe('Tarea 2 - P4: classId == null (clausula 3.4)', () => {
	test('property: con activa cutoff D no nulo -> retorna D y emite console.warn', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			await fc.assert(
				fc.asyncProperty(cutoffArb, classIdArb, async (D, classId) => {
					warnSpy.mockClear()
					setDb([{ id: 1, classId, isActive: true, paymentCutoffDay: D }], [])
					const result = await resolveCutoffDay(STUDENT_ID, null)
					expect(result).toBe(D)
					expect(warnSpy).toHaveBeenCalled()
					const calls = warnSpy.mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : '')).join(' '))
					expect(calls.some((s) => /classId is null/.test(s))).toBe(true)
				}),
				{ numRuns: 50 },
			)
		} finally {
			warnSpy.mockRestore()
		}
	})

	test('property: con activa cutoff null -> retorna DEFAULT_CUTOFF_DAY = 15 y emite console.warn', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			await fc.assert(
				fc.asyncProperty(classIdArb, async (classId) => {
					warnSpy.mockClear()
					setDb([{ id: 1, classId, isActive: true, paymentCutoffDay: null }], [])
					const result = await resolveCutoffDay(STUDENT_ID, null)
					expect(result).toBe(DEFAULT_CUTOFF_DAY)
					expect(warnSpy).toHaveBeenCalled()
				}),
				{ numRuns: 50 },
			)
		} finally {
			warnSpy.mockRestore()
		}
	})

	test('sub-caso: sin activas -> retorna SAFETY_NET = 30 y emite console.warn', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			setDb([], [])
			const result = await resolveCutoffDay(STUDENT_ID, null)
			expect(result).toBe(SAFETY_NET_CUTOFF_DAY)
			expect(warnSpy).toHaveBeenCalled()
			const calls = warnSpy.mock.calls.map((args) => args.map((a) => (typeof a === 'string' ? a : '')).join(' '))
			expect(calls.some((s) => /classId is null/.test(s))).toBe(true)
		} finally {
			warnSpy.mockRestore()
		}
	})

	test('sub-caso: solo inscripciones inactivas -> retorna SAFETY_NET = 30 y emite console.warn', async () => {
		const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			setDb(
				[
					{ id: 1, classId: 42, isActive: false, paymentCutoffDay: 15 },
					{ id: 2, classId: 99, isActive: false, paymentCutoffDay: 30 },
				],
				[],
			)
			const result = await resolveCutoffDay(STUDENT_ID, null)
			expect(result).toBe(SAFETY_NET_CUTOFF_DAY)
			expect(warnSpy).toHaveBeenCalled()
		} finally {
			warnSpy.mockRestore()
		}
	})
})

describe('Tarea 2 - P5: activa con cadena saliente anomala -> activa gana (clausula 3.8)', () => {
	test('property: activa cutoff D + transfer fromClassId=classId hacia otra activa con cutoff distinto -> retorna D', async () => {
		await fc.assert(
			fc.asyncProperty(classIdArb, classIdArb, transferredAtArb, async (classId, otherId, t) => {
				fc.pre(otherId !== classId)
				setDb(
					[
						{ id: 1, classId, isActive: true, paymentCutoffDay: 15 },
						{ id: 2, classId: otherId, isActive: true, paymentCutoffDay: 30 },
					],
					[{ id: 1, fromClassId: classId, toClassId: otherId, transferredAt: t }],
				)
				const result = await resolveCutoffDay(STUDENT_ID, classId)
				expect(result).toBe(15)
			}),
			{ numRuns: 50 },
		)
	})

	test('property: forall D activa cutoff D + cadena hacia otra activa cutoff E distinto -> retorna D', async () => {
		await fc.assert(
			fc.asyncProperty(cutoffArb, cutoffArb, classIdArb, classIdArb, async (D, E, classId, otherId) => {
				fc.pre(otherId !== classId && D !== E)
				setDb(
					[
						{ id: 1, classId, isActive: true, paymentCutoffDay: D },
						{ id: 2, classId: otherId, isActive: true, paymentCutoffDay: E },
					],
					[{ id: 1, fromClassId: classId, toClassId: otherId, transferredAt: new Date(2026, 4, 15) }],
				)
				const result = await resolveCutoffDay(STUDENT_ID, classId)
				expect(result).toBe(D)
			}),
			{ numRuns: 50 },
		)
	})

	test('caso concreto: classId=41 activa cutoff 15, transfer 41 -> 4 con 4 activa cutoff 30 -> 15', async () => {
		setDb(
			[
				{ id: 1, classId: 41, isActive: true, paymentCutoffDay: 15 },
				{ id: 2, classId: 4, isActive: true, paymentCutoffDay: 30 },
			],
			[{ id: 1, fromClassId: 41, toClassId: 4, transferredAt: new Date(2026, 4, 15) }],
		)
		const result = await resolveCutoffDay(STUDENT_ID, 41)
		expect(result).toBe(15)
	})
})
