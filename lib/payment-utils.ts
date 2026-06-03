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
 * Resolves the payment cutoff day for a student's active enrollment in a given class.
 *
 * Centralizes the lookup of `paymentCutoffDay` so every payment-related read uses the
 * enrollment that matches the payment's `(studentId, classId)` pair.
 *
 * @param studentId - Identifier of the student.
 * @param classId - Identifier of the class. When `null`, the function falls back to the
 *   student's first active enrollment and emits a warn-log, since the cutoff cannot be
 *   scoped to a specific class.
 * @returns The active enrollment's `paymentCutoffDay`. When an active enrollment exists
 *   but its stored cutoff is `null`, returns the standard cutoff (`15`). Returns `30` only
 *   as a genuine safety net when no active enrollment is resolvable.
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
	// 30 solo cuando no hay inscripción activa resoluble; si existe pero el corte es nulo, usar 15.
	if (!enrollment) return SAFETY_NET_CUTOFF_DAY;
	return enrollment.paymentCutoffDay ?? DEFAULT_CUTOFF_DAY;
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
