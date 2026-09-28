// Only loaded for Scherger HQ (see React.lazy in RecipeDetail), so visitors never download Tiptap.
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { NOTES_MAX_HTML } from "../../shared/notes";

export default function NotesEditor({ initialHtml, onSave }: { initialHtml: string; onSave: (html: string) => Promise<boolean> }) {
	const [saved, setSaved] = useState(initialHtml);
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

	const editor = useEditor({
		// Just what the toolbar offers: bold, italic, lists, links. Everything else is off,
		// so pasted headings/tables/styles fall back to plain paragraphs.
		extensions: [
			StarterKit.configure({
				heading: false,
				blockquote: false,
				codeBlock: false,
				code: false,
				horizontalRule: false,
				strike: false,
				underline: false,
				link: {
					openOnClick: false,
					autolink: true,
					defaultProtocol: "https",
					protocols: ["mailto"],
					HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
				},
			}),
		],
		content: initialHtml,
		editorProps: { attributes: { class: "notes-editor-body", "aria-label": "Scherger notes" } },
	});

	const state = useEditorState({
		editor,
		selector: ({ editor: e }) => ({
			bold: e?.isActive("bold") ?? false,
			italic: e?.isActive("italic") ?? false,
			bullets: e?.isActive("bulletList") ?? false,
			numbers: e?.isActive("orderedList") ?? false,
			link: e?.isActive("link") ?? false,
			html: e ? (e.isEmpty ? "" : e.getHTML()) : saved,
		}),
	});
	if (!editor || !state) return null;

	const dirty = state.html !== saved;
	const tooLong = state.html.length > NOTES_MAX_HTML;
	const chain = () => editor.chain().focus();

	const setLink = () => {
		const current = editor.getAttributes("link").href as string | undefined;
		const url = window.prompt("Link to (leave empty to remove):", current ?? "https://");
		if (url === null) return;
		if (!url.trim() || url.trim() === "https://") chain().extendMarkRange("link").unsetLink().run();
		else chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
		// Drop the cursor after the link, so the next keystroke doesn't replace the linked text.
		editor.chain().focus().setTextSelection(editor.state.selection.to).run();
	};

	const save = async () => {
		setStatus("saving");
		const html = state.html;
		if (await onSave(html)) {
			setSaved(html);
			setStatus("saved");
		} else setStatus("error");
	};

	const tool = (label: string, title: string, active: boolean, run: () => void) => (
		<button
			type="button"
			className={active ? "on" : ""}
			aria-pressed={active}
			title={title}
			aria-label={title}
			onMouseDown={(e) => e.preventDefault()} // keep the text selection
			onClick={run}
		>
			{label}
		</button>
	);

	return (
		<div className="notes-editor">
			<span className="admin-tag">🔑 SCHERGER NOTES</span>
			<div className="notes-toolbar" role="toolbar" aria-label="Formatting">
				{tool("B", "Bold", state.bold, () => chain().toggleBold().run())}
				{tool("I", "Italic", state.italic, () => chain().toggleItalic().run())}
				{tool("• List", "Bullet list", state.bullets, () => chain().toggleBulletList().run())}
				{tool("1. List", "Numbered list", state.numbers, () => chain().toggleOrderedList().run())}
				{tool("🔗 Link", "Link", state.link, setLink)}
			</div>
			<EditorContent editor={editor} />
			<div className="admin-buttons">
				<button type="button" className="approve-btn" disabled={status === "saving" || !dirty || tooLong} onClick={save}>
					{status === "saved" && !dirty ? "✓ NOTES SAVED" : "SAVE NOTES"}
				</button>
				{tooLong && <span className="admin-error">That's a lot of notes. Trim them a little to save.</span>}
				{status === "error" && <span className="admin-error">Couldn't save. Is your token still valid?</span>}
			</div>
		</div>
	);
}
