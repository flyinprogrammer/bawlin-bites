import { KONAMI } from "../konami";
import { blip } from "../sfx";

const GLYPH: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", b: "B", a: "A" };
const BUTTONS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "b", "a"] as const;

// Touch screens have no arrow keys, so the pad fires the same keydown events the keyboard would.
const press = (key: string) => {
	blip("select");
	window.dispatchEvent(new KeyboardEvent("keydown", { key }));
};

/** The ↑↑↓↓←→←→BA sequence (lighting up as you go) plus buttons to enter it. */
export function KonamiPad({ progress }: { progress: number }) {
	return (
		<div className="konami">
			<ol className="secret-code" aria-label={`Up up down down left right left right B A. ${progress} of ${KONAMI.length} entered.`}>
				{KONAMI.map((k, i) => (
					<li key={i} className={i < progress ? "hit" : ""}>
						{GLYPH[k]}
					</li>
				))}
			</ol>
			<div className="secret-pad" role="group" aria-label="Enter the code">
				{BUTTONS.map((k) => (
					<button key={k} type="button" onClick={() => press(k)} aria-label={k.replace("Arrow", "")}>
						{GLYPH[k]}
					</button>
				))}
			</div>
		</div>
	);
}
