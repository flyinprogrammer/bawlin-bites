import { useRef } from "react";
import type { Tally, Vote } from "../useVotes";
import { blip } from "../sfx";

function burst(el: HTMLElement, good: boolean) {
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const colors = good ? ["#ffc733", "#1b1a17", "#ff5a36", "#3fae5a"] : ["#1b1a17", "#8a8578"];
	for (let i = 0; i < (good ? 14 : 6); i++) {
		const p = document.createElement("span");
		p.className = "particle";
		const angle = (Math.PI * 2 * i) / (good ? 14 : 6) + Math.random() * 0.4;
		const dist = 30 + Math.random() * 30;
		p.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
		p.style.setProperty("--dy", `${Math.sin(angle) * dist - (good ? 20 : -10)}px`);
		p.style.background = colors[i % colors.length];
		el.appendChild(p);
		setTimeout(() => p.remove(), 700);
	}
	if (good) {
		const t = document.createElement("span");
		t.className = "one-up";
		t.textContent = "1UP!";
		el.appendChild(t);
		setTimeout(() => t.remove(), 900);
	}
}

export function VoteButtons({
	recipeId,
	tally,
	mine,
	onVote,
	size = "sm",
}: {
	recipeId: string;
	tally?: Tally;
	mine?: Vote;
	onVote: (id: string, v: Vote) => Promise<number>;
	size?: "sm" | "lg";
}) {
	const upRef = useRef<HTMLButtonElement>(null);
	const downRef = useRef<HTMLButtonElement>(null);

	const vote = async (v: Vote) => {
		const btn = v === 1 ? upRef.current : downRef.current;
		const willSet = mine !== v;
		if (willSet && btn) burst(btn, v === 1);
		blip(willSet ? (v === 1 ? "up" : "down") : "close");
		await onVote(recipeId, v);
	};

	return (
		<div className={`votes votes-${size}`}>
			<button
				ref={upRef}
				type="button"
				className={`vote up${mine === 1 ? " active" : ""}`}
				aria-pressed={mine === 1}
				aria-label={`Thumbs up (${tally?.up ?? 0})`}
				onClick={() => vote(1)}
			>
				<span aria-hidden="true">👍</span> {tally?.up ?? 0}
			</button>
			<button
				ref={downRef}
				type="button"
				className={`vote down${mine === -1 ? " active" : ""}`}
				aria-pressed={mine === -1}
				aria-label={`Thumbs down (${tally?.down ?? 0})`}
				onClick={() => vote(-1)}
			>
				<span aria-hidden="true">👎</span> {tally?.down ?? 0}
			</button>
		</div>
	);
}
