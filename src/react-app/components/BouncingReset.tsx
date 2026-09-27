import { useEffect, useRef, useState } from "react";

const COLORS = ["#5fd4ff", "#ff5fa2", "#b6ff3b", "#ffe066", "#ff7a1a", "#c69cff"];
const SPEED = 160; // px per second, per axis

/** The "reset to lo-fi" button, drifting around the screen like an idle DVD player logo. */
export function BouncingReset({ onClick }: { onClick: () => void }) {
	const ref = useRef<HTMLButtonElement>(null);
	const paused = useRef(false);
	const [color, setColor] = useState(0);
	const [corner, setCorner] = useState(false);

	useEffect(() => {
		const el = ref.current!;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // stays parked in the corner

		let x = Math.random() * Math.max(0, window.innerWidth - el.offsetWidth);
		let y = Math.random() * Math.max(0, window.innerHeight - el.offsetHeight);
		let vx = SPEED;
		let vy = SPEED;
		let last = performance.now();
		let raf = 0;
		let cornerTimer: ReturnType<typeof setTimeout> | undefined;

		const frame = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000); // clamp so a background tab doesn't teleport it
			last = now;
			if (!paused.current) {
				const maxX = window.innerWidth - el.offsetWidth;
				const maxY = window.innerHeight - el.offsetHeight;
				x += vx * dt;
				y += vy * dt;
				let hitX = false;
				let hitY = false;
				if (x <= 0 || x >= maxX) {
					x = Math.min(Math.max(x, 0), maxX);
					vx = x <= 0 ? SPEED : -SPEED;
					hitX = true;
				}
				if (y <= 0 || y >= maxY) {
					y = Math.min(Math.max(y, 0), maxY);
					vy = y <= 0 ? SPEED : -SPEED;
					hitY = true;
				}
				if (hitX || hitY) setColor((c) => (c + 1) % COLORS.length);
				if (hitX && hitY) {
					setCorner(true);
					clearTimeout(cornerTimer);
					cornerTimer = setTimeout(() => setCorner(false), 1500);
				}
				el.style.transform = `translate(${x}px, ${y}px)`;
			}
			raf = requestAnimationFrame(frame);
		};
		el.classList.add("bouncing");
		raf = requestAnimationFrame(frame);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(cornerTimer);
		};
	}, []);

	return (
		<button
			ref={ref}
			type="button"
			className={`reset-lofi${corner ? " corner" : ""}`}
			style={{ background: COLORS[color] }}
			onClick={onClick}
			onPointerEnter={() => (paused.current = true)}
			onPointerLeave={() => (paused.current = false)}
			onFocus={() => (paused.current = true)}
			onBlur={() => (paused.current = false)}
		>
			↺ RESET TO LO-FI
			{corner && <span className="corner-hit">CORNER!!</span>}
		</button>
	);
}
