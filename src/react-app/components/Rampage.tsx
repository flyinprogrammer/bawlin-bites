import { useEffect, useRef, useState } from "react";
import { recipes } from "../../shared/recipes";
import { blip } from "../sfx";
import { KaijuSprite } from "./Kaiju";

const VX = 480; // px/s sideways
const VY = 260; // px/s down the page

/**
 * Turbo mode: the kaiju bunny stomps its way down the page, zig-zagging and
 * smashing every recipe cartridge it touches. Loops back to the top at the bottom.
 */
export function Rampage({ onSmash, onCrown }: { onSmash: (id: string) => void; onCrown: (id: string) => void }) {
	const ref = useRef<HTMLDivElement>(null);
	const quipRef = useRef<HTMLParagraphElement>(null);
	const smash = useRef(onSmash);
	const crown = useRef(onCrown);
	const [quip, setQuip] = useState<string | null>(null);

	useEffect(() => {
		smash.current = onSmash;
		crown.current = onCrown;
	}, [onSmash, onCrown]);

	useEffect(() => {
		const el = ref.current!;
		const app = el.parentElement!;
		const start = () => {
			const stage = document.querySelector(".kaiju-stage")?.getBoundingClientRect();
			return stage ? { x: stage.left + window.scrollX, y: stage.top + window.scrollY } : { x: 0, y: 200 };
		};
		let { x, y } = start();
		let vx = -VX;
		let last = performance.now();
		let raf = 0;
		let quipTimer: ReturnType<typeof setTimeout> | undefined;
		const hit = new Set<Element>();

		const frame = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			const size = el.offsetWidth;
			const maxX = app.clientWidth - size;
			x += vx * dt;
			y += VY * dt;
			if (x <= 0 || x >= maxX) {
				x = Math.min(Math.max(x, 0), maxX);
				vx = x <= 0 ? VX : -VX;
			}
			if (y > app.scrollHeight - size) {
				({ x, y } = start()); // stomped off the bottom: come back around
				hit.clear();
			}
			// Facing: the sprite looks right, so mirror it when heading left.
			el.style.transform = `translate(${x}px, ${y}px) scaleX(${vx < 0 ? -1 : 1})`;
			// The speech bubble follows along but never mirrors.
			if (quipRef.current) quipRef.current.style.transform = `translate(${x + size * 0.2}px, ${y - 20}px) translateY(-100%)`;

			// Anything under the bunny's body gets busted.
			const body = { l: x + size * 0.15, r: x + size * 0.75, t: y + size * 0.2, b: y + size * 0.9 };
			for (const card of document.querySelectorAll<HTMLElement>(".cart[data-id]:not(.smashed):not(.crowned)")) {
				if (hit.has(card)) continue;
				const r = card.getBoundingClientRect();
				const c = { l: r.left + window.scrollX, r: r.right + window.scrollX, t: r.top + window.scrollY, b: r.bottom + window.scrollY };
				if (body.l < c.r && body.r > c.l && body.t < c.b && body.b > c.t) {
					hit.add(card);
					const id = card.dataset.id!;
					if (card.dataset.fave !== undefined) {
						// Its favorite: spared, crowned, and moved to #1.
						crown.current(id);
						rubble(app, (c.l + c.r) / 2, (c.t + c.b) / 2, "sparkle");
						blip("up");
						setQuip(recipes.find((r) => r.id === id)?.kaijuFave ?? "mine. 🥕");
						clearTimeout(quipTimer);
						quipTimer = setTimeout(() => setQuip(null), 4000);
						continue;
					}
					smash.current(id);
					rubble(app, (c.l + c.r) / 2, (c.t + c.b) / 2);
					blip("smash");
					document.body.classList.add("quake");
					setTimeout(() => document.body.classList.remove("quake"), 450);
				}
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(quipTimer);
		};
	}, []);

	return (
		<>
			<div ref={ref} className="rampage mood-rage" aria-hidden="true">
				<KaijuSprite mood="rage" loose />
				<span className="kaiju-breath">
					<span className="beam" />
				</span>
			</div>
			<p ref={quipRef} className="kaiju-quip" role="status" hidden={!quip}>
				{quip}
			</p>
		</>
	);
}

function rubble(app: HTMLElement, cx: number, cy: number, kind: "rubble" | "sparkle" = "rubble") {
	for (let i = 0; i < 14; i++) {
		const p = document.createElement("span");
		p.className = kind;
		const a = (Math.PI * 2 * i) / 14 + Math.random() * 0.5;
		const d = 60 + Math.random() * 90;
		p.style.left = `${cx}px`;
		p.style.top = `${cy}px`;
		p.style.setProperty("--dx", `${Math.cos(a) * d}px`);
		p.style.setProperty("--dy", `${Math.sin(a) * d + 60}px`);
		p.style.setProperty("--s", `${6 + Math.random() * 10}px`);
		app.appendChild(p);
		setTimeout(() => p.remove(), 900);
	}
}
