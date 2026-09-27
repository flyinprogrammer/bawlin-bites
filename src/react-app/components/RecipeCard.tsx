import type { Recipe } from "../../shared/recipes";
import type { Tally, Vote } from "../useVotes";
import { BallArt } from "./BallArt";
import { StatBar } from "./StatBar";
import { VoteButtons } from "./VoteButtons";

export function RecipeCard({
	recipe,
	index,
	tally,
	mine,
	onOpen,
	onVote,
	isTop,
	smashed = false,
}: {
	recipe: Recipe;
	index: number;
	tally?: Tally;
	mine?: Vote;
	onOpen: (id: string) => void;
	onVote: (id: string, v: Vote) => Promise<number>;
	isTop: boolean;
	/** Busted up by the rampaging kaiju (turbo mode). */
	smashed?: boolean;
}) {
	// Deterministic "how badly it got hit" per card.
	const tilt = ((index * 37) % 24) - 12;
	return (
		<article
			className={`cart${smashed ? " smashed" : ""}`}
			data-id={recipe.id}
			style={{ "--label": recipe.art.body, "--label-shade": recipe.art.shade, "--tilt": `${tilt || 9}deg` } as React.CSSProperties}
		>
			{smashed && (
				<span className="ko" aria-hidden="true">
					K.O.
				</span>
			)}
			<button type="button" className="cart-open" onClick={() => onOpen(recipe.id)} aria-label={`Open ${recipe.name}`}>
				<div className="cart-grip" aria-hidden="true">
					<span />
					<span />
					<span />
					<span />
				</div>
				<div className="cart-label">
					<span className="cart-no">No.{String(index + 1).padStart(2, "0")}</span>
					{isTop && <span className="cart-badge">HI-SCORE</span>}
					<BallArt recipe={recipe} size={112} className="cart-ball" />
				</div>
				<div className="cart-body">
					<h3>{recipe.name}</h3>
					<p className="cart-tagline">{recipe.tagline}</p>
					<div className="cart-stats">
						<StatBar label="PWR" value={recipe.stats.energy} />
						<StatBar label="SWT" value={recipe.stats.sweet} />
						<StatBar label="CRN" value={recipe.stats.crunch} />
					</div>
					<div className="cart-meta">
						<span>⏱ {recipe.prepMins} min</span>
						<span>◉ {recipe.makes}</span>
						<span>{"★".repeat(recipe.difficulty)}{"☆".repeat(3 - recipe.difficulty)}</span>
					</div>
				</div>
			</button>
			<div className="cart-foot">
				<VoteButtons recipeId={recipe.id} tally={tally} mine={mine} onVote={onVote} />
				<button type="button" className="cart-play" onClick={() => onOpen(recipe.id)} tabIndex={-1} aria-hidden="true">
					PLAY ▶
				</button>
			</div>
		</article>
	);
}
