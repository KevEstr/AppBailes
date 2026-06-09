/**
 * Pure subset selection used by the INVENTORY_PURCHASE backfill.
 *
 * Given a list of candidate inventory movements with their prices and a target
 * amount, attempts to select a subset whose price sum matches the target within
 * an absolute tolerance of 0.01.
 */

export type SubsetCandidate = {
	id: number
	price: number
}

export type SubsetResult = {
	selected: SubsetCandidate[] | null
	minAbsDiff: number | null
	aborted: boolean
}

const TOLERANCE = 0.01

/**
 * Selects a subset of `candidates` whose `price` sum equals `target` within an
 * absolute tolerance of 0.01.
 *
 * Algorithm:
 * 1. Greedy prefix in the input order: returns the first prefix whose sum is
 *    within tolerance.
 * 2. Exhaustive search over all non-empty subsets, only when `N <= maxExhaustive`
 *    and the greedy step did not find a match.
 * 3. Abort without exhaustive search when `N > maxExhaustive` and the greedy
 *    step did not find a match.
 *
 * `minAbsDiff` tracks the minimum `|sumSubset - target|` observed over every
 * subset evaluated by the algorithm. On the abort path (step 3) it only
 * reflects the prefixes evaluated during step 1. When `N === 0` it is `null`.
 *
 * @param candidates Candidate movements ordered as the caller wants the greedy
 * step to consume them.
 * @param target Target amount to match.
 * @param maxExhaustive Inclusive upper bound on `N` for which the exhaustive
 * search may run. Defaults to 12.
 * @returns A {@link SubsetResult} describing the outcome.
 */
export function selectSubset(
	candidates: readonly SubsetCandidate[],
	target: number,
	maxExhaustive: number = 12,
): SubsetResult {
	const n = candidates.length

	if (n === 0) {
		return { selected: null, minAbsDiff: null, aborted: false }
	}

	let minAbsDiff = Number.POSITIVE_INFINITY

	let prefixSum = 0
	for (let i = 0; i < n; i++) {
		prefixSum += candidates[i].price
		const diff = Math.abs(prefixSum - target)
		if (diff < minAbsDiff) minAbsDiff = diff
		if (diff <= TOLERANCE) {
			return {
				selected: candidates.slice(0, i + 1),
				minAbsDiff: diff,
				aborted: false,
			}
		}
	}

	if (n > maxExhaustive) {
		return { selected: null, minAbsDiff, aborted: true }
	}

	const total = 1 << n
	for (let mask = 1; mask < total; mask++) {
		let sum = 0
		const subset: SubsetCandidate[] = []
		for (let i = 0; i < n; i++) {
			if ((mask & (1 << i)) !== 0) {
				sum += candidates[i].price
				subset.push(candidates[i])
			}
		}
		const diff = Math.abs(sum - target)
		if (diff < minAbsDiff) minAbsDiff = diff
		if (diff <= TOLERANCE) {
			return { selected: subset, minAbsDiff: diff, aborted: false }
		}
	}

	return { selected: null, minAbsDiff, aborted: false }
}
