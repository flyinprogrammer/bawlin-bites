import { useEffect, useRef, useState } from "react";
import { FOOD_PROCESSOR, needsFoodProcessor, type Recipe } from "../../shared/recipes";
import type { Tally, Vote } from "../useVotes";
import { blip } from "../sfx";
import { BallArt } from "./BallArt";
import { StatBar } from "./StatBar";
import { VoteButtons } from "./VoteButtons";

export function RecipeDetail({
	recipe,
	tally,
	mine,
	onVote,
	onClose,
}: {
	recipe: Recipe;
	tally?: Tally;
	mine?: Vote;
	onVote: (id: string, v: Vote) => Promise<number>;
	onClose: () => void;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const [checked, setChecked] = useState<Set<number>>(new Set());

	useEffect(() => {
		const dialog = ref.current!;
		if (!dialog.open) dialog.showModal();
		return () => dialog.close();
	}, []);

	const toggle = (i: number) => {
		blip("select");
		setChecked((s) => {
			const next = new Set(s);
			if (next.has(i)) next.delete(i);
			else next.add(i);
			return next;
		});
	};

	const allDone = checked.size === recipe.ingredients.length;

	return (
		<dialog
			ref={ref}
			className="detail"
			aria-labelledby="detail-title"
			onCancel={(e) => {
				e.preventDefault();
				onClose();
			}}
			onClick={(e) => {
				if (e.target === ref.current) onClose(); // backdrop click
			}}
		>
			<div className="detail-inner" style={{ "--label": recipe.art.body, "--label-shade": recipe.art.shade } as React.CSSProperties}>
				<header className="detail-head">
					<div className="detail-art">
						<BallArt recipe={recipe} size={180} className="spin-on-hover" />
					</div>
					<div className="detail-title">
						<span className="detail-kicker">NOW PLAYING</span>
						<h2 id="detail-title">{recipe.name}</h2>
						<p>{recipe.tagline}</p>
						<div className="detail-meta">
							<span>
								<b>PREP</b> {recipe.prepMins} min
							</span>
							<span>
								<b>TOTAL</b> {recipe.totalMins} min
							</span>
							<span>
								<b>MAKES</b> {recipe.makes}
							</span>
						</div>
						<div className="cart-stats">
							<StatBar label="PWR" value={recipe.stats.energy} />
							<StatBar label="SWT" value={recipe.stats.sweet} />
							<StatBar label="CRN" value={recipe.stats.crunch} />
						</div>
					</div>
					<button type="button" className="detail-close" onClick={onClose} aria-label="Close recipe">
						✕
					</button>
				</header>

				<div className="detail-actions">
					<VoteButtons recipeId={recipe.id} tally={tally} mine={mine} onVote={onVote} size="lg" />
					<button
						type="button"
						className="print-btn"
						onClick={() => {
							blip("coin");
							window.print();
						}}
					>
						🖨 PRINT IT
					</button>
				</div>

				<div className="detail-body">
					<section>
						<h3>
							INVENTORY <small>{allDone ? "ALL ITEMS COLLECTED!" : `${checked.size}/${recipe.ingredients.length}`}</small>
						</h3>
						<ul className="ingredients">
							{recipe.ingredients.map((ing, i) => (
								<li key={i}>
									<label className={checked.has(i) ? "got" : ""}>
										<input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
										<span className="qty">{ing.qty}</span> <span>{ing.item}</span>
										{ing.note && <em> ({ing.note})</em>}
									</label>
								</li>
							))}
						</ul>
					</section>
					<section>
						<h3>LEVELS</h3>
						<ol className="steps">
							{recipe.steps.map((s, i) => (
								<li key={i}>
									<span className="step-no">{i + 1}</span>
									<p>{s}</p>
								</li>
							))}
						</ol>
						{recipe.tip && (
							<p className="tip">
								<b>PRO TIP:</b> {recipe.tip}
							</p>
						)}
						{needsFoodProcessor(recipe) && (
							<aside className="gear">
								<span className="gear-icon" aria-hidden="true">⚙</span>
								<div>
									<span className="promo-title">REQUIRED ITEM: FOOD PROCESSOR</span>
									<p>{FOOD_PROCESSOR.blurb}</p>
									<a href={FOOD_PROCESSOR.url} target="_blank" rel="noreferrer" onClick={() => blip("coin")}>
										Equip the {FOOD_PROCESSOR.name} ▶
									</a>
								</div>
							</aside>
						)}
						{recipe.promo && (
							<aside className="promo">
								<span className="promo-title">★ {recipe.promo.title} ★</span>
								<p>{recipe.promo.blurb}</p>
								<a className="promo-cta" href={recipe.promo.url} target="_blank" rel="noreferrer" onClick={() => blip("coin")}>
									{recipe.promo.cta}
								</a>
							</aside>
						)}
						{recipe.source && (
							<p className="source">
								Adapted from{" "}
								<a href={recipe.source.url} target="_blank" rel="noreferrer">
									{recipe.source.name}
								</a>
								.
							</p>
						)}
					</section>
				</div>
			</div>
		</dialog>
	);
}

/** Plain black-and-white version that only shows up on paper. */
export function PrintSheet({ recipe }: { recipe: Recipe }) {
	return (
		<article className="print-sheet" aria-hidden="true">
			<header>
				<BallArt recipe={recipe} size={72} />
				<div>
					<h1>{recipe.name}</h1>
					<p>{recipe.tagline}</p>
					<p className="print-meta">
						Prep {recipe.prepMins} min · Total {recipe.totalMins} min · Makes {recipe.makes}
					</p>
				</div>
			</header>
			<div className="print-cols">
				<section>
					<h2>Ingredients</h2>
					<ul>
						{recipe.ingredients.map((ing, i) => (
							<li key={i}>
								<span className="box" /> <b>{ing.qty}</b> {ing.item}
								{ing.note && <em> ({ing.note})</em>}
							</li>
						))}
					</ul>
				</section>
				<section>
					<h2>Steps</h2>
					<ol>
						{recipe.steps.map((s, i) => (
							<li key={i}>{s}</li>
						))}
					</ol>
					{recipe.tip && (
						<p>
							<b>Tip:</b> {recipe.tip}
						</p>
					)}
				</section>
			</div>
			<footer>
				BAWLIN' BITES · bawls.scherger.cloud/r/{recipe.id}
				{recipe.source && <> · Adapted from {recipe.source.name} ({recipe.source.url})</>}
				{recipe.promo && <> · More recipes: {recipe.promo.url}</>}
			</footer>
		</article>
	);
}
