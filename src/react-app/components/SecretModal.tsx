import { useEffect, useRef, useState } from "react";
import { blip } from "../sfx";
import { KonamiPad } from "./KonamiPad";

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
				<KonamiPad progress={progress} />
				<button type="button" className="secret-close" onClick={onClose}>
					NAH, I'M GOOD
				</button>
			</div>
		</dialog>
	);
}
