import { prisma } from '@/lib/prisma';

/**
 * Cutoff day applied when an active enrollment is resolvable but its stored
 * `paymentCutoffDay` is `null`. Maps to the standard "día 20 del mismo mes" schedule.
 */
const DEFAULT_CUTOFF_DAY = 15;

/**
 * Cutoff day used strictly as a safety net when no active enrollment can be resolved
 * for the requested scope. Maps to the "día 5 del mes siguiente" schedule.
 */
const SAFETY_NET_CUTOFF_DAY = 30;

/**
 * Maximum number of hops allowed when traversing a student's `student_transfers`
 * chain. Mirrors the convention used in sibling specs (e.g.
 * `regenerate-deletes-active-class-payment-after-transfer`) to bound the search and
 * provide a deterministic upper limit on traversal cost.
 */
const MAX_TRANSFER_CHAIN_HOPS = 10;

/**
 * Walks the student's `student_transfers` chain starting at `startClassId` and returns
 * the `paymentCutoffDay` of the first reachable active enrollment.
 *
 * Traversal is deterministic (`transferredAt asc, id asc`), cycle-safe via a visited
 * set, and bounded by `MAX_TRANSFER_CHAIN_HOPS`. The helper internally applies the
 * `null -> DEFAULT_CUTOFF_DAY` convention so the caller never has to disambiguate
 * "active destination found with null cutoff" from "no active destination": a numeric
 * return always means an active destination was reached.
 *
 * @param studentId - Identifier of the student.
 * @param startClassId - `classId` whose enrollment is inactive and whose outbound chain
 *   must be followed.
 * @returns The active destination's `paymentCutoffDay` (or `DEFAULT_CUTOFF_DAY` when
 *   that destination has `null` cutoff). Returns `null` only when no active destination
 *   is reachable, when a cycle is detected, or when the hop limit is exhausted.
 */
async function findActiveDestinationCutoff(
	studentId: string,
	startClassId: number,
): Promise<number | null> {
	const transfers = await prisma.studentTransfer.findMany({
		where: { studentId },
		orderBy: [{ transferredAt: 'asc' }, { id: 'asc' }],
		select: { fromClassId: true, toClassId: true, transferredAt: true, id: true },
	});

	const chainMap = new Map<number, Array<{ toClassId: number; transferredAt: Date; id: number }>>();
	transfers.forEach((t) => {
		if (t.toClassId == null) return; // baja (WITHDRAWAL), no es parte de la cadena
		const edges = chainMap.get(t.fromClassId) ?? [];
		edges.push({ toClassId: t.toClassId, transferredAt: t.transferredAt, id: t.id });
		chainMap.set(t.fromClassId, edges);
	});

	const reachable = new Set<number>();
	const visited = new Set<number>([startClassId]);
	const stack: Array<{ node: number; depth: number }> = [{ node: startClassId, depth: 0 }];

	while (stack.length > 0) {
		const current = stack.pop() as { node: number; depth: number };
		if (current.depth >= MAX_TRANSFER_CHAIN_HOPS) {
			console.warn('[resolveCutoffDay] hop exhaustion', {
				studentId,
				startClassId,
				MAX_HOPS: MAX_TRANSFER_CHAIN_HOPS,
			});
			continue;
		}
		const edges = chainMap.get(current.node) ?? [];
		for (const e of edges) {
			if (visited.has(e.toClassId)) {
				console.warn('[resolveCutoffDay] cycle detected', {
					studentId,
					startClassId,
					node: e.toClassId,
				});
				continue;
			}
			visited.add(e.toClassId);
			reachable.add(e.toClassId);
			stack.push({ node: e.toClassId, depth: current.depth + 1 });
		}
	}

	if (reachable.size === 0) return null;

	const activeRows = await prisma.classEnrollment.findMany({
		where: {
			studentId,
			classId: { in: Array.from(reachable) },
			isActive: true,
		},
		select: { classId: true, paymentCutoffDay: true },
	});

	if (activeRows.length === 0) return null;

	const activeMap = new Map<number, number | null>(activeRows.map((r) => [r.classId, r.paymentCutoffDay]));

	const visited2 = new Set<number>([startClassId]);
	const queue: number[] = [startClassId];

	while (queue.length > 0) {
		const node = queue.shift() as number;
		const edges = chainMap.get(node) ?? [];
		for (const e of edges) {
			if (visited2.has(e.toClassId)) continue;
			visited2.add(e.toClassId);
			if (activeMap.has(e.toClassId)) {
				return activeMap.get(e.toClassId) ?? DEFAULT_CUTOFF_DAY;
			}
			queue.push(e.toClassId);
		}
	}

	return null;
}

/**
 * Resolves the payment cutoff day for a student's active enrollment in a given class.
 *
 * Centralizes the lookup of `paymentCutoffDay` so every payment-related read uses the
 * enrollment that matches the payment's `(studentId, classId)` pair. When the
 * enrollment for `(studentId, classId)` exists but is inactive, the helper follows the
 * student's `student_transfers` chain (deterministic, cycle-safe, bounded) and returns
 * the cutoff of the active destination instead of degrading to the safety-net value.
 *
 * @param studentId - Identifier of the student.
 * @param classId - Identifier of the class. When `null`, the function falls back to the
 *   student's first active enrollment and emits a warn-log, since the cutoff cannot be
 *   scoped to a specific class.
 * @returns The active enrollment's `paymentCutoffDay`. When an active enrollment exists
 *   but its stored cutoff is `null`, returns the standard cutoff (`15`). When the
 *   enrollment for `(studentId, classId)` is inactive but the transfer chain reaches an
 *   active destination, returns that destination's cutoff (or `15` when its cutoff is
 *   `null`). Returns `30` only as a genuine safety net when no enrollment exists for the
 *   tuple, or when the chain has no reachable active destination.
 */
export async function resolveCutoffDay(studentId: string, classId: number | null): Promise<number> {
	if (classId == null) {
		console.warn('[resolveCutoffDay] classId is null, falling back to first active enrollment', { studentId });
		const fallback = await prisma.classEnrollment.findFirst({
			where: { studentId, isActive: true },
			select: { paymentCutoffDay: true },
		});
		// Sin inscripción activa: red de seguridad. Con inscripción pero corte nulo: corte estándar.
		if (!fallback) return SAFETY_NET_CUTOFF_DAY;
		return fallback.paymentCutoffDay ?? DEFAULT_CUTOFF_DAY;
	}

	const enrollment = await prisma.classEnrollment.findFirst({
		where: { studentId, classId, isActive: true },
		select: { paymentCutoffDay: true },
	});
	if (enrollment) {
		return enrollment.paymentCutoffDay ?? DEFAULT_CUTOFF_DAY;
	}

	// Rama (c): el lookup activo no acertó. Distinguir "no hay inscripción" de
	// "inscripción inactiva por transferencia" antes de caer a la red de seguridad.
	const inactive = await prisma.classEnrollment.findFirst({
		where: { studentId, classId },
		select: { id: true },
	});
	if (!inactive) return SAFETY_NET_CUTOFF_DAY;

	const destinationCutoff = await findActiveDestinationCutoff(studentId, classId);
	if (destinationCutoff !== null) return destinationCutoff;

	console.warn('[resolveCutoffDay] inactive enrollment without active destination', { studentId, classId });
	return SAFETY_NET_CUTOFF_DAY;
}

/**
 * Builds the composite key used to index cutoff days by student and class.
 *
 * Keying by `(studentId, classId)` prevents mixing students that share a class
 * but have different cutoff days.
 *
 * @param studentId - Identifier of the student.
 * @param classId - Identifier of the class (or `null`).
 * @returns A stable string key in the form `studentId:classId`.
 */
export function cutoffMapKey(studentId: string, classId: number | null): string {
	return `${studentId}:${classId}`;
}

/**
 * Builds a map of cutoff days indexed by `(studentId, classId)`.
 *
 * Each entry resolves to the enrollment's `paymentCutoffDay`, or `30` when the
 * stored value is `null` (safety-net default). Indexing by the composite key
 * guarantees that two students sharing a class never clobber each other's cutoff.
 *
 * @param enrollments - Active enrollments with `studentId`, `classId` and `paymentCutoffDay`.
 * @returns A map keyed by `cutoffMapKey(studentId, classId)`.
 */
export function buildCutoffDaysMap(
	enrollments: Array<{ studentId: string; classId: number; paymentCutoffDay: number | null }>,
): Map<string, number> {
	const cutoffDaysMap = new Map<string, number>();
	enrollments.forEach((enrollment) => {
		cutoffDaysMap.set(cutoffMapKey(enrollment.studentId, enrollment.classId), enrollment.paymentCutoffDay ?? 30);
	});
	return cutoffDaysMap;
}
