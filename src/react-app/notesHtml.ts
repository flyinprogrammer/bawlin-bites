import createDOMPurify, { type DOMPurify } from "dompurify";

// The only markup notes may contain: what the editor's toolbar can make.
const ALLOWED_TAGS = ["p", "br", "strong", "em", "ul", "ol", "li", "a"];
const ALLOWED_ATTR = ["href", "target", "rel"];
const SAFE_URL = /^(?:https?:|mailto:)/i;

/**
 * Notes are shown to every visitor, so even though only the admin can write them,
 * everything is cleaned to that tiny allowlist before it touches the page.
 */
export function createNotesSanitizer(purify: DOMPurify) {
	purify.addHook("afterSanitizeAttributes", (node) => {
		if (node.nodeName === "A") {
			const href = node.getAttribute("href") ?? "";
			if (!SAFE_URL.test(href)) node.removeAttribute("href");
			node.setAttribute("target", "_blank");
			node.setAttribute("rel", "noopener noreferrer nofollow");
		}
	});
	return (html: string) =>
		tidy(purify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOWED_URI_REGEXP: SAFE_URL }));
}

const BLANK = "(?:\\s|&nbsp;|<br>)*";
/** Drop the empty paragraphs and bullets an editor leaves behind when you press Enter a few times. */
function tidy(html: string) {
	return html
		.replace(new RegExp(`<li><p>${BLANK}</p></li>`, "g"), "")
		.replace(new RegExp(`<p>${BLANK}</p>`, "g"), "")
		.replace(/<(ul|ol)><\/\1>/g, "");
}

/** True if the (sanitized) HTML has any visible text. */
export function hasText(html: string) {
	return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
}

let sanitizer: ((html: string) => string) | undefined;
export function sanitizeNotes(html: string) {
	sanitizer ??= createNotesSanitizer(createDOMPurify(window));
	return sanitizer(html);
}
