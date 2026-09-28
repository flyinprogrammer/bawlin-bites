// Scherger notes: free text from the admin box, one bullet per line.
export const NOTES_MAX_LINES = 12;
export const NOTE_MAX_CHARS = 300;

/** Split textarea text into bullet lines (trimmed, blanks dropped). Null if over the limits. */
export function parseNotes(text: string): string[] | null {
	const lines = text
		.split(/\r?\n/)
		.map((l) => l.replace(/^\s*[-*•]\s*/, "").trim()) // pasted bullets are fine
		.filter(Boolean);
	if (lines.length > NOTES_MAX_LINES || lines.some((l) => l.length > NOTE_MAX_CHARS)) return null;
	return lines;
}
