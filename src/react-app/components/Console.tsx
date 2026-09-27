import { useEffect, useRef, useState } from "react";
import type { Recipe } from "../../shared/recipes";
import { BallArt } from "./BallArt";

const PX_PER_TURN = 900; // one full crank turn scrolls this far

/** A Playdate-ish handheld. The crank actually scrolls the page. */
export function Console({
	featured,
	onA,
	onB,
	onMenu,
	sound,
}: {
	featured: Recipe;
	onA: () => void;
	onB: () => void;
	onMenu: () => void;
	sound: boolean;
}) {
	const [angle, setAngle] = useState(0);
	const hubRef = useRef<HTMLDivElement>(null);
	const drag = useRef<{ last: number } | null>(null);

	useEffect(() => {
		const onScroll = () => setAngle((window.scrollY / PX_PER_TURN) * 360);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const pointerAngle = (e: React.PointerEvent) => {
		const box = hubRef.current!.getBoundingClientRect();
		return Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2));
	};

	const onPointerDown = (e: React.PointerEvent) => {
		e.currentTarget.setPointerCapture(e.pointerId);
		drag.current = { last: pointerAngle(e) };
	};
	const onPointerMove = (e: React.PointerEvent) => {
		if (!drag.current) return;
		const a = pointerAngle(e);
		let delta = a - drag.current.last;
		if (delta > Math.PI) delta -= 2 * Math.PI;
		if (delta < -Math.PI) delta += 2 * Math.PI;
		drag.current.last = a;
		window.scrollBy({ top: (delta / (2 * Math.PI)) * PX_PER_TURN, behavior: "instant" });
	};
	const onPointerUp = () => {
		drag.current = null;
	};
	const onCrankKey = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowDown" || e.key === "ArrowRight") window.scrollBy({ top: 120 });
		else if (e.key === "ArrowUp" || e.key === "ArrowLeft") window.scrollBy({ top: -120 });
		else return;
		e.preventDefault();
	};

	return (
		<div className="console" aria-label="A little handheld game console">
			<div className="console-screen">
				<div className="screen-inner">
					<span className="screen-title">BAWLIN'<br />BITES</span>
					<div className="screen-ball">
						<BallArt recipe={featured} size={56} />
					</div>
					<span className="screen-hint blink">◀ CRANK TO SCROLL</span>
				</div>
			</div>
			<div className="console-controls">
				<div className="dpad" aria-hidden="true">
					<span />
				</div>
				<button type="button" className="menu-btn" onClick={onMenu} aria-pressed={sound} title="Toggle sound">
					{sound ? "SND ON" : "SND OFF"}
				</button>
				<div className="ab">
					<button type="button" className="btn-b" onClick={onB} title="B: jump to the recipes">
						B
					</button>
					<button type="button" className="btn-a" onClick={onA} title="A: random recipe">
						A
					</button>
				</div>
			</div>
			<div className="crank-dock">
				<div className="crank-hub" ref={hubRef}>
					<div
						className="crank-arm"
						role="slider"
						tabIndex={0}
						aria-label="Crank: drag in circles (or use arrow keys) to scroll"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={Math.round((angle % 360) / 3.6)}
						style={{ transform: `rotate(${angle}deg)` }}
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerUp}
						onPointerCancel={onPointerUp}
						onKeyDown={onCrankKey}
					>
						<span className="crank-knob" />
					</div>
				</div>
			</div>
		</div>
	);
}
