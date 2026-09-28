// @vitest-environment jsdom
import createDOMPurify from "dompurify";
import { describe, expect, it } from "vitest";
import { linesToHtml, storedNotesToHtml } from "../shared/notes";
import { createNotesSanitizer, hasText } from "./notesHtml";

const clean = createNotesSanitizer(createDOMPurify(window));

describe("notes sanitizer", () => {
	it("keeps what the toolbar makes", () => {
		const html = "<p><strong>Bold</strong> and <em>italic</em></p><ul><li><p>one</p></li></ul><ol><li><p>two</p></li></ol>";
		expect(clean(html)).toBe(html);
	});

	it("keeps safe links and forces them to open safely in a new tab", () => {
		expect(clean('<a href="https://example.com">x</a>')).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">x</a>');
		expect(clean('<a href="mailto:hi@example.com">x</a>')).toContain('href="mailto:hi@example.com"');
	});

	it.each([
		["script tags", '<p>hi</p><script>alert(1)</script>', "<p>hi</p>"],
		["event handlers", '<p onclick="alert(1)">hi</p>', "<p>hi</p>"],
		["javascript: links", '<a href="javascript:alert(1)">x</a>', '<a target="_blank" rel="noopener noreferrer nofollow">x</a>'],
		["data: links", '<a href="data:text/html,<script>alert(1)</script>">x</a>', '<a target="_blank" rel="noopener noreferrer nofollow">x</a>'],
		["images", '<img src=x onerror="alert(1)">', ""],
		["iframes", '<iframe src="https://evil.example"></iframe>', ""],
		["inline styles", '<p style="position:fixed">hi</p>', "<p>hi</p>"],
		["headings (flattened)", "<h1>Big</h1>", "Big"],
		["svg", "<svg><script>alert(1)</script></svg>", ""],
	])("removes %s", (_, dirty, expected) => {
		expect(clean(dirty)).toBe(expected);
	});

	it("drops empty paragraphs and bullets left by extra Enter presses", () => {
		expect(clean("<ol><li><p></p></li><li><p>one</p></li><li><p> <br></p></li></ol><p></p><p>&nbsp;</p>")).toBe("<ol><li><p>one</p></li></ol>");
		expect(clean("<ul><li><p></p></li></ul><p>x</p>")).toBe("<p>x</p>");
	});

	it("knows when notes are empty", () => {
		expect(hasText("<p></p>")).toBe(false);
		expect(hasText("<p>&nbsp;</p>")).toBe(false);
		expect(hasText("<ul><li><p>x</p></li></ul>")).toBe(true);
	});
});

describe("plain notes → HTML", () => {
	it("turns lines into an escaped bullet list", () => {
		expect(linesToHtml(["A family favorite.", " <b>not bold</b> ", ""])).toBe(
			"<ul><li><p>A family favorite.</p></li><li><p>&lt;b&gt;not bold&lt;/b&gt;</p></li></ul>",
		);
		expect(linesToHtml([])).toBe("");
	});

	it("reads both the old stored format (array) and the new one ({html})", () => {
		expect(storedNotesToHtml('["one","two"]')).toBe("<ul><li><p>one</p></li><li><p>two</p></li></ul>");
		expect(storedNotesToHtml('{"html":"<p>hi</p>"}')).toBe("<p>hi</p>");
		expect(storedNotesToHtml('{"html":""}')).toBe("");
	});
});
