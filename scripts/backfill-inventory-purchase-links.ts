/**
 * Idempotent backfill script that associates legacy `INVENTORY_PURCHASE`
 * `financial_transactions` with their originating `inventory_movements` by
 * proximity of date and exact price-sum match within an absolute tolerance
 * of 0.01.
 *
 * Run via:
 *   node --import tsx scripts/backfill-inventory-purchase-links.ts \
 *       [--window-seconds=N] [--dry-run]
 *
 * This module exposes the classification engine as `runBackfill`, the
 * CLI parser as `parseBackfillArgs`, the pure report formatter as
 * `formatBackfillReport` and the exit-code calculator as `computeExitCode`.
 * The pure helpers are exported so they can be exercised by property-based
 * tests independently of the database.
 */

import { Prisma } from '@prisma/client'
import { fileURLToPath } from 'node:url'
import { prisma } from '@/lib/prisma'
import { selectSubset, type SubsetCandidate } from './backfill-select-subset'

const MAX_EXHAUSTIVE = 12
const DEFAULT_WINDOW_SECONDS = 300
const MIN_WINDOW_SECONDS = 1
const MAX_WINDOW_SECONDS = 86400

/**
 * Per-transaction classification produced by the backfill engine.
 *
 * `ASOCIADA` and `OMITIDA` carry the list of linked `inventoryMovementId`s.
 * `NO_ASOCIADA` carries the candidate-set size `n`, the failure `reason`
 * and the minimum absolute difference observed during the search.
 */
export type BackfillEntry =
	| { kind: 'ASOCIADA'; id: number; date: Date; amount: number; movementIds: number[] }
	| {
			kind: 'NO_ASOCIADA'
			id: number
			date: Date
			amount: number
			n: number
			reason: 'subset_no_encontrado' | 'abortada_por_tamaño'
			minAbsDiff: number | null
	  }
	| { kind: 'OMITIDA'; id: number; date: Date; amount: number; movementIds: number[] }

/** Effective CLI options consumed by the engine. */
export type BackfillOptions = {
	windowSeconds: number
	dryRun: boolean
}

/** Output of a single backfill run, ready to be consumed by a report emitter. */
export type BackfillResult = {
	options: BackfillOptions
	entries: BackfillEntry[]
}

/** Thrown by `parseBackfillArgs` on invalid or out-of-range CLI arguments. */
export class BackfillArgError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'BackfillArgError'
	}
}

/**
 * Parses the script CLI arguments.
 *
 * Accepts `--window-seconds=N`, `--window-seconds N`, `--dry-run`,
 * `--dry-run=true` and `--dry-run=false`. Defaults are
 * `windowSeconds=300` and `dryRun=false`.
 *
 * @throws {BackfillArgError} when an argument is unknown or
 * `--window-seconds` is not an integer in `[1, 86400]`.
 */
export function parseBackfillArgs(argv: readonly string[]): BackfillOptions {
	let windowSeconds = DEFAULT_WINDOW_SECONDS
	let dryRun = false

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]

		if (arg === '--dry-run' || arg === '--dry-run=true') {
			dryRun = true
			continue
		}
		if (arg === '--dry-run=false') {
			dryRun = false
			continue
		}
		if (arg.startsWith('--window-seconds=')) {
			windowSeconds = parseWindowSecondsValue(arg.slice('--window-seconds='.length))
			continue
		}
		if (arg === '--window-seconds') {
			const next = argv[i + 1]
			if (next === undefined) {
				throw new BackfillArgError('--window-seconds requires a value')
			}
			windowSeconds = parseWindowSecondsValue(next)
			i++
			continue
		}

		throw new BackfillArgError(`Unknown argument: ${arg}`)
	}

	return { windowSeconds, dryRun }
}

function parseWindowSecondsValue(raw: string): number {
	const n = Number(raw)
	if (!Number.isInteger(n) || n < MIN_WINDOW_SECONDS || n > MAX_WINDOW_SECONDS) {
		throw new BackfillArgError(
			`--window-seconds must be an integer in [${MIN_WINDOW_SECONDS}, ${MAX_WINDOW_SECONDS}], received: ${raw}`,
		)
	}
	return n
}

/**
 * Iterates `financial_transactions` with `relatedType='INVENTORY_PURCHASE'`
 * in ascending id order and classifies each one.
 *
 * Transactions that already have at least one bridge row are classified as
 * `OMITIDA` and left untouched. The remainder is matched against
 * `inventory_movements` with `movementType='PURCHASE'` and `price` not null
 * within `[date - windowSeconds, date + windowSeconds]`, ordered by
 * `createdAt` ascending. The subset selection delegates to `selectSubset`.
 *
 * When a match is found and `dryRun` is `false`, bridge rows are inserted in
 * a per-transaction `prisma.$transaction`. `P2002` (unique violation) is
 * treated as silent success to preserve idempotency under concurrent runs.
 */
export async function runBackfill(options: BackfillOptions): Promise<BackfillResult> {
	const entries: BackfillEntry[] = []

	const transactions = await prisma.financialTransaction.findMany({
		where: { relatedType: 'INVENTORY_PURCHASE' },
		orderBy: { id: 'asc' },
		select: {
			id: true,
			date: true,
			amount: true,
			inventoryLinks: {
				select: { inventoryMovementId: true },
				orderBy: { inventoryMovementId: 'asc' },
			},
		},
	})

	for (const t of transactions) {
		if (t.inventoryLinks.length > 0) {
			entries.push({
				kind: 'OMITIDA',
				id: t.id,
				date: t.date,
				amount: t.amount,
				movementIds: t.inventoryLinks.map(l => l.inventoryMovementId),
			})
			continue
		}

		const lower = new Date(t.date.getTime() - options.windowSeconds * 1000)
		const upper = new Date(t.date.getTime() + options.windowSeconds * 1000)

		const candidates = await prisma.inventoryMovement.findMany({
			where: {
				movementType: 'PURCHASE',
				price: { not: null },
				createdAt: { gte: lower, lte: upper },
			},
			orderBy: { createdAt: 'asc' },
			select: { id: true, price: true },
		})

		const subsetCandidates: SubsetCandidate[] = candidates.map(c => ({
			id: c.id,
			price: c.price as number,
		}))

		const result = selectSubset(subsetCandidates, t.amount, MAX_EXHAUSTIVE)

		if (result.selected !== null) {
			const movementIds = result.selected.map(c => c.id)
			if (!options.dryRun) {
				await persistBridgeRows(t.id, movementIds)
			}
			entries.push({
				kind: 'ASOCIADA',
				id: t.id,
				date: t.date,
				amount: t.amount,
				movementIds,
			})
			continue
		}

		entries.push({
			kind: 'NO_ASOCIADA',
			id: t.id,
			date: t.date,
			amount: t.amount,
			n: subsetCandidates.length,
			reason: result.aborted ? 'abortada_por_tamaño' : 'subset_no_encontrado',
			minAbsDiff: result.minAbsDiff,
		})
	}

	return { options, entries }
}

async function persistBridgeRows(
	financialTransactionId: number,
	inventoryMovementIds: readonly number[],
): Promise<void> {
	await prisma.$transaction(async tx => {
		for (const inventoryMovementId of inventoryMovementIds) {
			try {
				await tx.financialTransactionInventoryMovement.create({
					data: { financialTransactionId, inventoryMovementId },
				})
			} catch (e) {
				if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
					continue
				}
				throw e
			}
		}
	})
}

/**
 * Pure input shape consumed by `computeExitCode`.
 *
 * Decoupled from `BackfillResult` so the function can be exercised by
 * property-based tests without constructing a full `BackfillOptions`.
 */
export type ExitCodeInput = {
	entries: readonly BackfillEntry[]
	hadException: boolean
}

/**
 * Deterministic exit-code calculator for the backfill script.
 *
 * Returns `1` whenever an uncaught exception or DB connection error was
 * captured by the caller, `2` when at least one entry is `NO_ASOCIADA`
 * and no exception occurred, and `0` when all entries are `ASOCIADA` or
 * `OMITIDA` and no exception occurred.
 */
export function computeExitCode(input: ExitCodeInput): 0 | 1 | 2 {
	if (input.hadException) return 1
	if (input.entries.some(e => e.kind === 'NO_ASOCIADA')) return 2
	return 0
}

/**
 * Pure formatter that turns a `BackfillResult` into the textual report
 * defined in the design document.
 *
 * The output preserves the header counts, the reason breakdown for
 * `NO_ASOCIADA`, the effective CLI options and the three grouped lists
 * (`ASOCIADA`, `NO_ASOCIADA`, `OMITIDA`) with the fields specified by
 * requirements clauses 2.4, 2.5 and 2.6.
 *
 * `filas creadas en bridge` reflects the rows actually inserted, i.e. the
 * sum of `movementIds.length` across `ASOCIADA` entries when
 * `dryRun=false`, and `0` when `dryRun=true`.
 */
export function formatBackfillReport(result: BackfillResult): string {
	const { options, entries } = result

	const asociada = entries.filter(
		(e): e is Extract<BackfillEntry, { kind: 'ASOCIADA' }> => e.kind === 'ASOCIADA',
	)
	const noAsociada = entries.filter(
		(e): e is Extract<BackfillEntry, { kind: 'NO_ASOCIADA' }> => e.kind === 'NO_ASOCIADA',
	)
	const omitida = entries.filter(
		(e): e is Extract<BackfillEntry, { kind: 'OMITIDA' }> => e.kind === 'OMITIDA',
	)

	const subsetNoEncontrado = noAsociada.filter(e => e.reason === 'subset_no_encontrado').length
	const abortadaPorTamano = noAsociada.filter(e => e.reason === 'abortada_por_tamaño').length

	const filasCreadasEnBridge = options.dryRun
		? 0
		: asociada.reduce((sum, e) => sum + e.movementIds.length, 0)

	const lines: string[] = []
	lines.push('=== Backfill INVENTORY_PURCHASE links ===')
	lines.push(`window-seconds: ${options.windowSeconds}`)
	lines.push(`dry-run: ${options.dryRun}`)
	lines.push(`procesadas: ${entries.length}`)
	lines.push(`ASOCIADA: ${asociada.length}`)
	lines.push(
		`NO_ASOCIADA: ${noAsociada.length} (subset_no_encontrado: ${subsetNoEncontrado}, abortada_por_tamaño: ${abortadaPorTamano})`,
	)
	lines.push(`OMITIDA: ${omitida.length}`)
	lines.push(`filas creadas en bridge: ${filasCreadasEnBridge}`)

	lines.push('')
	lines.push('--- ASOCIADA ---')
	for (const e of asociada) {
		lines.push(
			`[id=${e.id}] date=${e.date.toISOString()} amount=${e.amount.toFixed(2)} movements=[${e.movementIds.join(', ')}]`,
		)
	}

	lines.push('')
	lines.push('--- NO_ASOCIADA ---')
	for (const e of noAsociada) {
		const minAbs = e.minAbsDiff === null ? 'null' : e.minAbsDiff.toFixed(2)
		lines.push(
			`[id=${e.id}] date=${e.date.toISOString()} amount=${e.amount.toFixed(2)} N=${e.n} razon=${e.reason} minAbsDiff=${minAbs}`,
		)
	}

	lines.push('')
	lines.push('--- OMITIDA ---')
	for (const e of omitida) {
		lines.push(
			`[id=${e.id}] date=${e.date.toISOString()} amount=${e.amount.toFixed(2)} movements=[${e.movementIds.join(', ')}]`,
		)
	}

	return lines.join('\n') + '\n'
}

async function main(): Promise<void> {
	let options: BackfillOptions
	try {
		options = parseBackfillArgs(process.argv.slice(2))
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		process.stderr.write(`${message}\n`)
		process.exit(1)
	}

	let exitCode: 0 | 1 | 2 = 0
	try {
		const result = await runBackfill(options)
		process.stdout.write(formatBackfillReport(result))
		exitCode = computeExitCode({ entries: result.entries, hadException: false })
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e)
		process.stderr.write(`${message}\n`)
		exitCode = 1
	} finally {
		await prisma.$disconnect()
	}
	process.exit(exitCode)
}

const invokedAsScript = (() => {
	if (typeof process === 'undefined') return false
	const entry = process.argv[1]
	if (typeof entry !== 'string') return false
	try {
		return fileURLToPath(import.meta.url) === entry
	} catch {
		return false
	}
})()

if (invokedAsScript) {
	void main()
}
