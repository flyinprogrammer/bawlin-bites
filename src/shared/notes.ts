// Scherger notes are rich text (HTML from the Tiptap editor). Older notes, and the
// built-in houseNotes in recipes.ts, are plain lines and get shown as a bullet list.
export const NOTES_MAX_HTML = 10_000;

export function escapeHtml(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Plain lines → a bullet list ("" for no lines). */
export function linesToHtml(lines: string[]): string {
	const items = lines.map((l) => l.trim()).filter(Boolean);
	return items.length ? `<ul>${items.map((l) => `<li><p>${escapeHtml(l)}</p></li>`).join("")}</ul>` : "";
}

/** What's in D1: either the old JSON array of lines or {"html": "..."}. */
export function storedNotesToHtml(raw: string): string {
	const parsed: unknown = JSON.parse(raw);
	if (Array.isArray(parsed)) return linesToHtml(parsed.filter((l): l is string => typeof l === "string"));
	if (parsed && typeof parsed === "object" && typeof (parsed as { html?: unknown }).html === "string") return (parsed as { html: string }).html;
	return "";
}
