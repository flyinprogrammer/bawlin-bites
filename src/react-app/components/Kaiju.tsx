import { memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { audioCtx, audioRunning, blip, onAudioStateChange } from "../sfx";

// A pixel-art kaiju bunny, rasterized from simple shapes and auto-outlined.
// Moods: asleep (sound off), scream (sound on but the browser hasn't unlocked
// audio yet), cute (lo-fi mode), rage (turbo mode: wrecks the city and the site).

const W = 56;
const H = 50;

type Key = "B" | "L" | "P" | "S" | "W" | "K" | "C" | "D" | "Y" | "R" | "F";
export type Mood = "asleep" | "scream" | "cute" | "rage" | "gone";
type Grid = (Key | null)[][];

function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, k: Key) {
	for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
		for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
			if (g[y]?.[x] !== undefined && ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) g[y][x] = k;
}
function rect(g: Grid, x0: number, y0: number, x1: number, y1: number, k: Key) {
	for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (g[y]?.[x] !== undefined) g[y][x] = k;
}
function spike(g: Grid, bx: number, by: number, size: number, k: Key) {
	// Triangle pointing up-left from a base point on the back.
	for (let i = 0; i < size; i++) rect(g, bx - i, by - i, bx - i + (size - i) - 1, by - i, k);
}

function draw(mood: Mood, withCity = true): Grid {
	const g: Grid = Array.from({ length: H }, () => Array<Key | null>(W).fill(null));
	if (mood !== "gone") drawBunny(g, mood);

	// Auto-outline: every empty pixel touching the monster becomes ink.
	const out = g.map((row) => row.slice());
	for (let y = 0; y < H; y++)
		for (let x = 0; x < W; x++) {
			if (g[y][x]) continue;
			const n = [g[y - 1]?.[x], g[y + 1]?.[x], g[y][x - 1], g[y][x + 1]];
			if (n.some((v) => v && v !== "K")) out[y][x] = "K";
		}
	if (withCity) drawCity(out, mood);
	return out;
}

function drawBunny(g: Grid, mood: Mood) {
	// Tail: a chain of shrinking blobs sweeping back to the ground.
	[
		[15, 38, 4.5],
		[11, 41, 4],
		[7, 43, 3.4],
		[4, 44.5, 2.6],
		[2, 45.5, 1.8],
	].forEach(([x, y, r]) => ellipse(g, x, y, r, r * 0.85, "B"));
	// Dorsal spines, behind the body.
	[
		[19, 17, 4],
		[16, 22, 5],
		[13, 28, 5],
		[11, 34, 4],
		[8, 39, 3],
	].forEach(([x, y, s]) => spike(g, x, y, s, "S"));
	// Ears.
	ellipse(g, 27, 7, 2.6, 7, "B");
	ellipse(g, 33, 6, 2.8, 7.5, "B");
	ellipse(g, 33, 6.5, 1.2, 5, "P");
	// Body, belly, head, snout.
	ellipse(g, 21, 31, 9.5, 12, "B");
	ellipse(g, 24.5, 32, 5, 9, "L");
	ellipse(g, 31, 17, 7.5, 6, "B");
	ellipse(g, 37, 19, 5, 3.8, "B");
	// Legs + feet stomping the ground.
	ellipse(g, 18, 42, 5, 4.5, "B");
	rect(g, 14, 45, 23, 47, "B");
	ellipse(g, 27, 42.5, 4, 4, "B");
	rect(g, 25, 45, 32, 47, "B");
	// Stubby arm with claws.
	ellipse(g, 30, 28, 3.2, 2, "B");
	g[29][33] = "W";
	g[27][33] = "W";

	// Face.
	const roar = () => {
		rect(g, 36, 20, 42, 22, "D");
		g[20][37] = g[20][39] = g[20][41] = "W";
		g[22][38] = g[22][40] = "W";
	};
	if (mood === "scream") {
		rect(g, 33, 15, 34, 16, "W");
		g[16][34] = "K";
		roar();
	} else if (mood === "rage") {
		rect(g, 33, 15, 34, 16, "R");
		rect(g, 32, 13, 33, 13, "K"); // angry brow slanting toward the snout
		rect(g, 34, 14, 35, 14, "K");
		roar();
	} else if (mood === "cute") {
		g[16][32] = g[15][33] = g[16][34] = "K"; // happy ^ eye
		g[21][37] = g[22][38] = g[22][39] = g[21][40] = "K"; // little smile
		g[19][32] = "P";
	} else {
		rect(g, 33, 16, 34, 16, "K");
		rect(g, 37, 21, 41, 21, "K");
	}
	g[19][31] = "P"; // blush
}

function drawCity(out: Grid, mood: Mood) {
	// A tiny city getting stomped, drawn after outlining so it stays crisp.
	const city: [number, number, number][] = [
		[36, 41, 5],
		[42, 37, 4],
		[47, 43, 6],
		[0, 47, 3],
	];
	const rage = mood === "rage" || mood === "gone";
	for (const [x, tall, w] of city) {
		// In rage the tall one got stomped; once the kaiju has left, everything is rubble.
		const top = mood === "gone" ? Math.max(tall, H - 5) : rage && x === 42 ? tall + 5 : tall;
		rect(out, x, top, x + w, H - 1, "K");
		rect(out, x + 1, top + 1, x + w - 1, H - 1, "C");
		for (let wy = top + 2; wy < H - 1; wy += 3)
			for (let wx = x + 2; wx < x + w - 1; wx += 2) out[wy][wx] = mood !== "asleep" && (wx + wy) % 3 ? "Y" : "K";
		if (rage) {
			// Flames licking off the roofs.
			for (let fx = x; fx <= x + w; fx++) {
				const h = 1 + ((fx * 7 + x) % 3);
				for (let fy = 1; fy <= h; fy++) if (out[top - fy]?.[fx] !== undefined && !out[top - fy][fx]) out[top - fy][fx] = fy === h ? "Y" : "F";
			}
		}
	}
	rect(out, 0, H - 1, W - 1, H - 1, "K");
	if (mood === "gone") {
		// Giant footprints leading off-stage.
		for (const fx of [8, 20, 32]) rect(out, fx, H - 2, fx + 4, H - 2, "K");
	}
}

const SPRITES: Record<Mood, Grid> = {
	asleep: draw("asleep"),
	scream: draw("scream"),
	cute: draw("cute"),
	rage: draw("rage"),
	gone: draw("gone"),
};
const LOOSE = draw("rage", false); // the roaming kaiju doesn't carry its city around

function Sprite({ mood, loose = false }: { mood: Mood; loose?: boolean }) {
	const grid = loose ? LOOSE : SPRITES[mood];
	const rects: React.ReactElement[] = [];
	grid.forEach((row, y) => {
		let x = 0;
		while (x < W) {
			const k = row[x];
			let w = 1;
			while (x + w < W && row[x + w] === k) w++;
			if (k) rects.push(<rect key={`${x}-${y}`} className={`px-${k}`} x={x} y={y} width={w} height={1} />);
			x += w;
		}
	});
	return (
		<svg className="kaiju-sprite" viewBox={`0 0 ${W} ${H}`} shapeRendering="crispEdges" aria-hidden="true">
			{rects}
		</svg>
	);
}
const MemoSprite = memo(Sprite);
export const KaijuSprite = MemoSprite;

function useAudioRunning() {
	return useSyncExternalStore(onAudioStateChange, audioRunning, () => false);
}

// What the bunny says as you keep poking it. One more poke after the last line = berserk.
const POKE_LINES = [
	"hehe, that tickles ♪",
	"okay… that's enough poking",
	"i'm serious. please stop.",
	"my spines are getting spicy…",
	"DO NOT POKE THE KAIJU",
	"LAST WARNING!!! 😤",
];
const CALM_DOWN_MS = 3500; // stop poking this long and it forgives you

export function Kaiju({
	sound,
	turbo,
	loose,
	onToggleSound,
	onBerserk,
}: {
	sound: boolean;
	turbo: boolean;
	/** The kaiju is off rampaging down the page, so the hero shows the wreckage. */
	loose: boolean;
	onToggleSound: (on: boolean) => void;
	/** Poked one too many times: go turbo. */
	onBerserk: () => void;
}) {
	const running = useAudioRunning();
	const locked = sound && !running; // sound is on but the browser hasn't let audio start yet
	const [woken, setWoken] = useState(false);
	const [pokes, setPokes] = useState(0);
	const calm = useRef<ReturnType<typeof setTimeout>>(undefined);
	useEffect(() => () => clearTimeout(calm.current), []);

	const awake = woken || sound;
	const anger = turbo ? 0 : pokes; // 0-6
	const mood: Mood = locked
		? "scream"
		: turbo
			? loose
				? "gone"
				: "rage"
			: !awake
				? "asleep"
				: anger >= 5
					? "rage"
					: anger >= 3
						? "scream"
						: "cute";
	const unlock = () => void audioCtx().resume();

	const poke = () => {
		if (locked) return unlock();
		if (turbo) return blip("down");
		if (!awake) {
			setWoken(true);
			return blip("coin");
		}
		const next = pokes + 1;
		clearTimeout(calm.current);
		if (next > POKE_LINES.length) {
			setPokes(0);
			onBerserk();
			return;
		}
		blip(next >= 5 ? "down" : "select");
		setPokes(next);
		calm.current = setTimeout(() => setPokes(0), CALM_DOWN_MS);
	};

	const bubble =
		anger > 0
			? POKE_LINES[anger - 1]
			: {
					scream: null,
					cute: woken && !sound ? "oh hi! (psst: hit SOUND for tunes ♪)" : "♪ just vibin' · CHILL MIX",
					rage: sound ? "RAAAWR!!! ♪ TURBO MIX" : "RAAAWR!!!",
					asleep: "zzz… (poke me)",
					gone: "⚠ IT GOT LOOSE!! ⚠ SCROLL DOWN",
				}[mood];

	return (
		<div className={`kaiju mood-${mood}${anger ? ` anger anger-${anger}` : ""}`}>
			{locked ? (
				<p className="kaiju-bubble scream" role="status">
					<b>HEY!! YOU!!!</b>
					CLICK THE BUTTON &amp; CRANK YOUR VOLUME!!!
				</p>
			) : (
				<p className="kaiju-bubble" role="status">
					{bubble}
				</p>
			)}
			<button type="button" className="kaiju-stage" aria-label="Poke the kaiju bunny" onClick={poke}>
				<MemoSprite mood={mood} />
				{mood === "rage" && !anger && (
					<span className="kaiju-breath" aria-hidden="true">
						<span className="beam" />
					</span>
				)}
				{mood === "cute" && (
					<span className="kaiju-float" aria-hidden="true">
						<span>♪</span>
						<span>♥</span>
						<span>♫</span>
						<span>♥</span>
					</span>
				)}
				{(locked || anger >= 3) && (
					<span className="kaiju-yell" aria-hidden="true">
						<span>!!</span>
						<span>!</span>
						<span>!!!</span>
					</span>
				)}
				{mood === "asleep" && (
					<span className="kaiju-z" aria-hidden="true">
						<span>z</span>
						<span>Z</span>
						<span>Z</span>
					</span>
				)}
			</button>
			{locked ? (
				<button type="button" className="kaiju-cta" onClick={unlock}>
					🔊 TURN ON THE SOUND
				</button>
			) : (
				<button type="button" className="sound-btn" aria-pressed={sound} onClick={() => onToggleSound(!sound)}>
					{sound ? "🔊 SOUND ON" : "🔇 SOUND OFF"}
				</button>
			)}
		</div>
	);
}

/** Pixel rubble raining down while the kaiju wrecks the place. */
export function Debris() {
	return (
		<div className="debris" aria-hidden="true">
			{Array.from({ length: 18 }, (_, i) => (
				<span
					key={i}
					style={
						{
							"--x": `${(i * 37) % 100}vw`,
							"--d": `${(i * 0.37) % 3}s`,
							"--t": `${2.2 + ((i * 7) % 10) / 6}s`,
							"--s": `${6 + ((i * 5) % 4) * 4}px`,
						} as React.CSSProperties
					}
				/>
			))}
		</div>
	);
}
