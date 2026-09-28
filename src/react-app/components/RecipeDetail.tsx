import { useEffect, useRef, useState } from "react";
import { FOOD_PROCESSOR, needsFoodProcessor, type Recipe } from "../../shared/recipes";
import { NOTE_MAX_CHARS, NOTES_MAX_LINES } from "../../shared/notes";
import { BATCHES, scaledIngredient, scaledMakes } from "../scaled";
import type { Approval } from "../useApprovals";
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
	checked,
	onCheck,
	batch,
	onBatch,
	grams,
	onGrams,
	approval,
	isAdmin,
	onSetApproval,
	notes,
	onSaveNotes,
}: {
	recipe: Recipe;
	tally?: Tally;
	mine?: Vote;
	onVote: (id: string, v: Vote) => Promise<number>;
	onClose: () => void;
	/** Indexes of ingredients ticked off (shared with the print sheet). */
	checked: ReadonlySet<number>;
	onCheck: (index: number) => void;
	/** 1, 2 or 3 batches (shared with the print sheet). */
	batch: number;
	onBatch: (times: number) => void;
	/** Show verified gram weights next to the cups/spoons. */
	grams: boolean;
	onGrams: (on: boolean) => void;
	approval?: Approval;
	isAdmin: boolean;
	onSetApproval: (approved: boolean) => Promise<boolean>;
	/** The Scherger notes to show (edited ones from D1, or the recipe's built-in ones). */
	notes: string[];
	onSaveNotes: (text: string) => Promise<boolean>;
}) {
	const ref = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = ref.current!;
		if (!dialog.open) dialog.showModal();
		return () => dialog.close();
	}, []);

	const toggle = (i: number) => {
		blip("select");
		onCheck(i);
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
						{approval && <ApprovalSeal approval={approval} />}
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
								<b>MAKES</b> {scaledMakes(recipe, batch)}
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

				{isAdmin && (
					<AdminPanel key={recipe.id} approval={approval} notes={notes} onSetApproval={onSetApproval} onSaveNotes={onSaveNotes} />
				)}

				<div className="detail-body">
					<section>
						<h3>
							INVENTORY <small>{allDone ? "ALL ITEMS COLLECTED!" : `${checked.size}/${recipe.ingredients.length}`}</small>
						</h3>
						<div className="batch-bar">
							<div className="batch" role="radiogroup" aria-label="Batch size">
								{BATCHES.map((b) => (
									<button
										key={b.times}
										type="button"
										role="radio"
										aria-checked={batch === b.times}
										aria-label={b.name}
										className={batch === b.times ? "on" : ""}
										onClick={() => {
											blip("select");
											onBatch(b.times);
										}}
									>
										{b.label}
									</button>
								))}
							</div>
							<label className="grams-toggle">
								<input type="checkbox" checked={grams} onChange={(e) => onGrams(e.target.checked)} />
								⚖ GRAMS
							</label>
						</div>
						<ul className={`ingredients${grams ? " with-grams" : ""}`}>
							{recipe.ingredients.map((ing, i) => {
								const line = scaledIngredient(ing, batch);
								return (
									<li key={i}>
										<label className={checked.has(i) ? "got" : ""}>
											<input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
											<span className="ing-text">
												<span className="qty">{line.qty}</span> <span>{line.item}</span>
												{ing.note && <em> ({ing.note})</em>}
											</span>
											{grams && (
												<span
													className={`grams${line.grams === null ? " none" : ""}`}
													title={line.gramsFromCard ? "Weight from the recipe card" : undefined}
												>
													{line.grams === null ? line.noWeight : `${line.gramsExact ? "" : "≈"}${line.grams} g`}
												</span>
											)}
										</label>
									</li>
								);
							})}
						</ul>
						{grams && (
							<p className="grams-note">
								Grams come from the recipe card when it lists them; otherwise they only appear where King Arthur
								Baking and USDA data agree within 5% for that exact ingredient. Either way, only for 1 tbsp or more. Everything else (oats, dates, whole nuts, dried fruit…) packs too
								differently to weigh reliably, so measure it with cups.
							</p>
						)}
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
						{notes.length > 0 && (
							<aside className="house-notes">
								<b>SCHERGER NOTES</b>
								<ul>
									{notes.map((n, i) => (
										<li key={i}>{n}</li>
									))}
								</ul>
							</aside>
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

/** Plain black-and-white version that only shows up on paper. Ticked ingredients print ticked. */
export function PrintSheet({
	recipe,
	checked,
	batch,
	grams,
	approval,
	notes,
}: {
	recipe: Recipe;
	checked: ReadonlySet<number>;
	batch: number;
	grams: boolean;
	approval?: Approval;
	notes: string[];
}) {
	const batchName = BATCHES.find((b) => b.times === batch)?.name;
	return (
		<article className="print-sheet" aria-hidden="true">
			<header>
				<BallArt recipe={recipe} size={72} />
				<div>
					<h1>{recipe.name}</h1>
					<p>{recipe.tagline}</p>
					<p className="print-meta">
						{batch > 1 && <>{batchName} ({batch}×) · </>}Prep {recipe.prepMins} min · Total {recipe.totalMins} min · Makes{" "}
						{scaledMakes(recipe, batch)}
					</p>
					{approval && <p className="print-meta">✓ Scherger tested &amp; approved</p>}
				</div>
			</header>
			<div className="print-cols">
				<section>
					<h2>Ingredients</h2>
					<ul>
						{recipe.ingredients.map((ing, i) => {
							const line = scaledIngredient(ing, batch);
							return (
								<li key={i} className={checked.has(i) ? "got" : ""}>
									<span className="box">{checked.has(i) ? "✓" : ""}</span> <b>{line.qty}</b> {line.item}
									{ing.note && <em> ({ing.note})</em>}
									{grams && line.grams !== null && !line.gramsExact && <span className="print-grams"> ≈{line.grams} g</span>}
								</li>
							);
						})}
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
					{notes.length > 0 && (
						<>
							<p>
								<b>Scherger notes:</b>
							</p>
							<ul className="print-notes">
								{notes.map((n, i) => (
									<li key={i}>{n}</li>
								))}
							</ul>
						</>
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

function ApprovalSeal({ approval }: { approval: Approval }) {
	const date = new Date(approval.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
	return (
		<div className="approval-seal">
			<span className="seal-stamp" aria-hidden="true">
				✓
			</span>
			<div>
				<b>SCHERGER TESTED &amp; APPROVED</b>
				<span>
					{date}
				</span>
			</div>
		</div>
	);
}

/** Only rendered for someone logged in with the admin token. */
function AdminPanel({
	approval,
	notes,
	onSetApproval,
	onSaveNotes,
}: {
	approval?: Approval;
	notes: string[];
	onSetApproval: (approved: boolean) => Promise<boolean>;
	onSaveNotes: (text: string) => Promise<boolean>;
}) {
	const [text, setText] = useState(notes.join("\n"));
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const dirty = text.trim() !== notes.join("\n").trim();
	const run = async (action: () => Promise<boolean>, doneState: "idle" | "saved" = "idle") => {
		setStatus("saving");
		setStatus((await action()) ? doneState : "error");
	};
	return (
		<div className="admin-approval">
			<label className="admin-notes">
				<span className="admin-tag">🔑 SCHERGER NOTES · one per line</span>
				<textarea
					rows={Math.min(8, Math.max(3, text.split("\n").length + 1))}
					maxLength={NOTES_MAX_LINES * (NOTE_MAX_CHARS + 1)}
					placeholder={"We roll half in coconut.\nThese are a family favorite."}
					value={text}
					onChange={(e) => {
						setText(e.target.value);
						setStatus("idle");
					}}
				/>
			</label>
			<div className="admin-buttons">
				<button type="button" className="approve-btn" disabled={status === "saving" || !dirty} onClick={() => run(() => onSaveNotes(text), "saved")}>
					{status === "saved" && !dirty ? "✓ NOTES SAVED" : "SAVE NOTES"}
				</button>
				{approval ? (
					<button type="button" className="unapprove-btn" disabled={status === "saving"} onClick={() => run(() => onSetApproval(false))}>
						REMOVE APPROVAL
					</button>
				) : (
					<button type="button" className="approve-btn" disabled={status === "saving"} onClick={() => run(() => onSetApproval(true))}>
						✓ MARK TESTED &amp; APPROVED
					</button>
				)}
			</div>
			{status === "error" && (
				<span className="admin-error">
					Couldn't save. Max {NOTES_MAX_LINES} lines of {NOTE_MAX_CHARS} characters, and your token must still be valid.
				</span>
			)}
		</div>
	);
}
