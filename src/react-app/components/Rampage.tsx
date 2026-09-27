import { useEffect, useRef } from "react";
import { blip } from "../sfx";
import { KaijuSprite } from "./Kaiju";

const VX = 150; // px/s sideways
const VY = 80; // px/s down the page

/**
 * Turbo mode: the kaiju bunny stomps its way down the page, zig-zagging and
 * smashing every recipe cartridge it touches. Loops back to the top at the bottom.
 */
export function Rampage({ onSmash }: { onSmash: (id: string) => void }) {
	const ref = useRef<HTMLDivElement>(null);
	const smash = useRef(onSmash);

	useEffect(() => {
		smash.current = onSmash;
	}, [onSmash]);

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

			// Anything under the bunny's body gets busted.
			const body = { l: x + size * 0.15, r: x + size * 0.75, t: y + size * 0.2, b: y + size * 0.9 };
			for (const card of document.querySelectorAll<HTMLElement>(".cart[data-id]:not(.smashed)")) {
				if (hit.has(card)) continue;
				const r = card.getBoundingClientRect();
				const c = { l: r.left + window.scrollX, r: r.right + window.scrollX, t: r.top + window.scrollY, b: r.bottom + window.scrollY };
				if (body.l < c.r && body.r > c.l && body.t < c.b && body.b > c.t) {
					hit.add(card);
					smash.current(card.dataset.id!);
					rubble(app, (c.l + c.r) / 2, (c.t + c.b) / 2);
					blip("smash");
					document.body.classList.add("quake");
					setTimeout(() => document.body.classList.remove("quake"), 450);
				}
			}
			raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => cancelAnimationFrame(raf);
	}, []);

	return (
		<div ref={ref} className="rampage mood-rage" aria-hidden="true">
			<KaijuSprite mood="rage" loose />
			<span className="kaiju-breath">
				<span className="beam" />
			</span>
		</div>
	);
}

function rubble(app: HTMLElement, cx: number, cy: number) {
	for (let i = 0; i < 14; i++) {
		const p = document.createElement("span");
		p.className = "rubble";
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
