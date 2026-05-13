/**
 * Utilidades de formato de fechas ancladas a America/Bogota.
 *
 * Los campos DateTime @db.Timestamptz de Prisma se serializan como UTC (sufijo "Z"),
 * por lo tanto el formato para UI debe convertir explicitamente a la zona horaria
 * de Colombia. Antes se parseaba el string ignorando el offset, lo cual producia
 * desfases cuando la hora cruzaba medianoche UTC.
 */

const BOGOTA_TZ = "America/Bogota"

function toDate(input: string | Date): Date | null {
	if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input
	const d = new Date(input)
	return Number.isNaN(d.getTime()) ? null : d
}

function formatParts(
	date: Date,
	options: Intl.DateTimeFormatOptions,
): Record<string, string> {
	const fmt = new Intl.DateTimeFormat("es-CO", { timeZone: BOGOTA_TZ, ...options })
	const parts: Record<string, string> = {}
	for (const p of fmt.formatToParts(date)) {
		if (p.type !== "literal") parts[p.type] = p.value
	}
	return parts
}

/**
 * DD/MM/YYYY HH:mm en zona Colombia.
 */
export function formatDateWithoutTimezone(dateString: string | Date): string {
	const date = toDate(dateString)
	if (!date) return String(dateString)
	const p = formatParts(date, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	})
	return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}`
}

/**
 * DD/MM/YYYY en zona Colombia.
 */
export function formatDateOnlyWithoutTimezone(dateString: string | Date): string {
	const date = toDate(dateString)
	if (!date) return String(dateString)
	const p = formatParts(date, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
	return `${p.day}/${p.month}/${p.year}`
}

/**
 * "D de mes de YYYY" en zona Colombia.
 */
export function formatDateLongWithoutTimezone(dateString: string | Date): string {
	const date = toDate(dateString)
	if (!date) return String(dateString)
	const p = formatParts(date, {
		year: "numeric",
		month: "long",
		day: "numeric",
	})
	return `${p.day} de ${p.month} de ${p.year}`
}

/**
 * "D mes YYYY" corto en zona Colombia.
 */
export function formatDateShortWithoutTimezone(dateString: string | Date): string {
	const date = toDate(dateString)
	if (!date) return String(dateString)
	const p = formatParts(date, {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
	return `${p.day} ${p.month.replace(".", "")} ${p.year}`
}

/**
 * HH:mm en zona Colombia.
 */
export function formatTimeWithoutTimezone(dateString: string | Date): string {
	const date = toDate(dateString)
	if (!date) return String(dateString)
	const p = formatParts(date, { hour: "2-digit", minute: "2-digit", hour12: false })
	return `${p.hour}:${p.minute}`
}

/**
 * "D de mes de YYYY, HH:mm" en zona Colombia. Uso principal: listado de asistencias.
 */
export function formatDateTimeBogota(dateString: string | Date): string {
	const date = toDate(dateString)
	if (!date) return String(dateString)
	const p = formatParts(date, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	})
	return `${p.day} de ${p.month} de ${p.year}, ${p.hour}:${p.minute}`
}

/**
 * Serializa una Date local como ISO con offset -05:00 (usado para enviar al servidor).
 */
export function localDateToISOString(date: Date): string {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	const hours = String(date.getHours()).padStart(2, "0")
	const minutes = String(date.getMinutes()).padStart(2, "0")
	const seconds = String(date.getSeconds()).padStart(2, "0")
	return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000-05:00`
}
