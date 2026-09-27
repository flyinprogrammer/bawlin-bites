import { useEffect, useRef, useState } from "react";
import { blip } from "../sfx";

import { KONAMI } from "../konami";
const GLYPH: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", b: "B", a: "A" };

/** Crashes onto the screen when you reach the bottom and teaches you the Konami code. */
export function SecretModal({ progress, onClose }: { progress: number; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	const [landed, setLanded] = useState(false);

	useEffect(() => {
		const dialog = ref.current!;
		if (!dialog.open) dialog.showModal();
		blip("down");
		const t = setTimeout(() => {
			setLanded(true);
			document.body.classList.add("quake");
			setTimeout(() => document.body.classList.remove("quake"), 500);
		}, 520);
		return () => {
			clearTimeout(t);
			dialog.close();
		};
	}, []);

	// Touch screens have no arrow keys, so the pad fires the same keydown events.
	const press = (key: string) => window.dispatchEvent(new KeyboardEvent("keydown", { key }));

	return (
		<dialog
			ref={ref}
			className={`secret${landed ? " landed" : ""}`}
			aria-labelledby="secret-title"
			onCancel={(e) => {
				e.preventDefault();
				onClose();
			}}
		>
			<div className="secret-inner">
				<p className="secret-warning">⚠ WARNING ⚠</p>
				<h2 id="secret-title">SECRET FOUND!</h2>
				<p>You scrolled all the way down. Legend says entering the ancient code unlocks TURBO MODE.</p>
				<ol className="secret-code" aria-label="Up up down down left right left right B A">
					{KONAMI.map((k, i) => (
						<li key={i} className={i < progress ? "hit" : ""}>
							{GLYPH[k]}
						</li>
					))}
				</ol>
				<div className="secret-pad" role="group" aria-label="Enter the code">
					{(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "b", "a"] as const).map((k) => (
						<button key={k} type="button" onClick={() => press(k)} aria-label={k.replace("Arrow", "")}>
							{GLYPH[k]}
						</button>
					))}
				</div>
				<button type="button" className="secret-close" onClick={onClose}>
					NAH, I'M GOOD
				</button>
			</div>
		</dialog>
	);
}
