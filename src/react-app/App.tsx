import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RENAMED, recipes } from "../shared/recipes";
import { BouncingReset } from "./components/BouncingReset";
import { Debris, Kaiju } from "./components/Kaiju";
import { Rampage } from "./components/Rampage";
import { RecipeCard } from "./components/RecipeCard";
import { PrintSheet, RecipeDetail } from "./components/RecipeDetail";
import { SecretModal } from "./components/SecretModal";
import { KONAMI } from "./konami";
import { setMusic } from "./music";
import { blip, setSound, soundOn } from "./sfx";
import { useVotes } from "./useVotes";

type Sort = "top" | "quick" | "az";

const FILTERS = ["nut-free", "kid-made", "dates", "oats", "chocolate", "coconut", "cashew", "peanut", "almond", "fruit", "no oats"];
const sources = [...new Map(recipes.filter((r) => r.source).map((r) => [r.source!.name, r.source!])).values()];

function idFromPath(path: string) {
	const m = path.match(/^\/r\/([a-z0-9-]+)\/?$/);
	if (!m) return null;
	const id = RENAMED[m[1]] ?? m[1];
	if (!recipes.some((r) => r.id === id)) return null;
	if (id !== m[1]) history.replaceState(history.state, "", `/r/${id}`); // old link -> new slug
	return id;
}

export default function App() {
	const { tallies, mine, cast, online } = useVotes();
	const [openId, setOpenId] = useState<string | null>(() => idFromPath(location.pathname));
	const [filter, setFilter] = useState<string | null>(null);
	const [sort, setSort] = useState<Sort>("top");
	const [sound, setSoundState] = useState(soundOn);
	const [turbo, setTurbo] = useState(false);
	const [konamiPos, setKonamiPos] = useState(0);
	const [smashed, setSmashed] = useState<ReadonlySet<string>>(new Set());
	const [calm] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
	const loose = turbo && !calm; // the kaiju leaves the hero and rampages down the page
	const smash = useCallback((id: string) => setSmashed((s) => new Set(s).add(id)), []);
	const [secretOpen, setSecretOpen] = useState(false);
	const footRef = useRef<HTMLElement>(null);

	// Tiny router: /r/<id> opens a recipe; back button closes it.
	useEffect(() => {
		const onPop = () => setOpenId(idFromPath(location.pathname));
		window.addEventListener("popstate", onPop);
		return () => window.removeEventListener("popstate", onPop);
	}, []);

	const open = useCallback((id: string) => {
		blip("coin");
		history.pushState({ recipe: id }, "", `/r/${id}`);
		setOpenId(id);
	}, []);

	const close = useCallback(() => {
		blip("close");
		if (history.state?.recipe) history.back();
		else history.replaceState(null, "", "/");
		setOpenId(null);
	}, []);

	useEffect(() => {
		const r = recipes.find((x) => x.id === openId);
		document.title = r ? `${r.name} · Bawlin' Bites` : "Bawlin' Bites";
	}, [openId]);

	useEffect(() => setMusic(sound, turbo ? "turbo" : "chill"), [sound, turbo]);

	// ↑↑↓↓←→←→BA
	useEffect(() => {
		let pos = 0;
		const onKey = (e: KeyboardEvent) => {
			const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
			pos = key === KONAMI[pos] ? pos + 1 : key === KONAMI[0] ? 1 : 0;
			if (pos === KONAMI.length) {
				pos = 0;
				setTurbo((t) => !t);
				setSmashed(new Set());
				setSecretOpen(false);
				blip("secret");
			}
			setKonamiPos(pos);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	// Hitting the bottom of the page for the first time crashes the secret modal in.
	useEffect(() => {
		const foot = footRef.current;
		if (!foot) return;
		const seen = () => {
			try {
				return localStorage.getItem("bb:secret-seen") === "1";
			} catch {
				return false;
			}
		};
		if (seen()) return;
		const io = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting || document.querySelector("dialog[open]")) return;
				io.disconnect();
				try {
					localStorage.setItem("bb:secret-seen", "1");
				} catch {
					/* ignore */
				}
				setSecretOpen(true);
			},
			{ threshold: 0.9 },
		);
		io.observe(foot);
		return () => io.disconnect();
	}, []);

	const score = useCallback((id: string) => (tallies[id]?.up ?? 0) - (tallies[id]?.down ?? 0), [tallies]);

	const topId = useMemo(() => {
		let best: string | null = null;
		for (const r of recipes) if (score(r.id) > 0 && (!best || score(r.id) > score(best))) best = r.id;
		return best;
	}, [score]);

	const shown = useMemo(() => {
		const list = recipes.map((r, i) => ({ r, i })).filter(({ r }) => !filter || r.tags.includes(filter));
		if (sort === "top") list.sort((a, b) => score(b.r.id) - score(a.r.id) || a.i - b.i);
		if (sort === "quick") list.sort((a, b) => a.r.totalMins - b.r.totalMins || a.i - b.i);
		if (sort === "az") list.sort((a, b) => a.r.name.localeCompare(b.r.name));
		return list;
	}, [filter, sort, score]);

	const random = () => {
		const pool = shown.length ? shown : recipes.map((r, i) => ({ r, i }));
		const pick = pool[Math.floor(Math.random() * pool.length)].r;
		open(pick.id);
	};

	const toRecipes = () => {
		blip("select");
		document.getElementById("recipes")?.scrollIntoView({ behavior: "smooth" });
	};

	const openRecipe = recipes.find((r) => r.id === openId);
	const topName = recipes.find((r) => r.id === topId)?.name;
	const ticker = turbo
		? ["⚠ KAIJU ATTACK ⚠", "EVACUATE THE SNACK BAR", "RESISTANCE IS FRUITLESS", "ENERGY LEVELS: CRITICAL", "DATES: DESTROYED", "CATCH THE STOP BUTTON TO END THE MADNESS"]
		: [
				"NO OVEN REQUIRED",
				topName ? `HI-SCORE: ${topName.toUpperCase()}` : "HI-SCORE: ??? (GO VOTE)",
				"INSERT DATES TO CONTINUE",
				`${recipes.length} CARTRIDGES LOADED`,
				"ROLL RESPONSIBLY",
				"PRINTER FRIENDLY",
			];

	return (
		<div className={`app${turbo ? " turbo" : ""}${openRecipe ? " has-open" : ""}`}>
			<header className="hero">
				<div className="hero-copy">
					<p className="hero-kicker">{recipes.length} NO-BAKE SNACKS · ZERO OVENS</p>
					<h1>
						BAWLIN'
						<br />
						BITES
					</h1>
					<p className="hero-sub">
						Energy balls made of dates, oats, nut butter and questionable decisions. Pick a cartridge, print it out, roll a batch, give it a
						thumbs up.
					</p>
					<div className="hero-ctas">
						<button type="button" className="chunky" onClick={toRecipes}>
							▶ PRESS START
						</button>
						<button type="button" className="chunky ghost" onClick={random}>
							? RANDOM BAWL
						</button>
					</div>
				</div>
				<Kaiju
					sound={sound}
					turbo={turbo}
					loose={loose}
					onToggle={(on) => {
						setSound(on);
						setSoundState(on);
					}}
				/>
			</header>

			<div className="marquee" aria-hidden="true">
				<div className="marquee-track">
					{[0, 1].map((k) => (
						<span key={k}>
							{ticker.map((t) => (
								<span key={t}>
									{t} <b>✦</b>{" "}
								</span>
							))}
						</span>
					))}
				</div>
			</div>

			<main id="recipes" className="recipes">
				<div className="toolbar">
					<h2>SELECT YOUR BAWL</h2>
					<div className="chips" role="group" aria-label="Filter by ingredient">
						<button type="button" className={`chip${!filter ? " on" : ""}`} aria-pressed={!filter} onClick={() => setFilter(null)}>
							ALL
						</button>
						{FILTERS.map((f) => (
							<button
								key={f}
								type="button"
								className={`chip${filter === f ? " on" : ""}`}
								aria-pressed={filter === f}
								onClick={() => {
									blip("select");
									setFilter(filter === f ? null : f);
								}}
							>
								{f.toUpperCase()}
							</button>
						))}
					</div>
					<label className="sort">
						SORT
						<select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
							<option value="top">Top rated</option>
							<option value="quick">Quickest</option>
							<option value="az">A → Z</option>
						</select>
					</label>
				</div>
				{!online && <p className="offline">⚠ Scoreboard offline: votes won't save right now.</p>}
				<div className="grid">
					{shown.map(({ r, i }) => (
						<RecipeCard
							key={r.id}
							recipe={r}
							index={i}
							tally={tallies[r.id]}
							mine={mine[r.id]}
							onOpen={open}
							onVote={cast}
							isTop={r.id === topId}
							smashed={smashed.has(r.id)}
						/>
					))}
				</div>
			</main>

			<footer className="foot" ref={footRef}>
				<p>
					BAWLIN' BITES · {new Date().getFullYear()} · MADE WITH DATES & LOVE
				</p>
				<p className="foot-small">
					Some recipes adapted from{" "}
					{sources.map((s, i) => (
						<span key={s.url}>
							{i > 0 && (i === sources.length - 1 ? " and " : ", ")}
							<a href={s.url} target="_blank" rel="noreferrer">
								{s.name}
							</a>
						</span>
					))}
					. Psst: ↑ ↑ ↓ ↓ ← → ← → B A
				</p>
			</footer>

			{loose && <Rampage onSmash={smash} />}

			{turbo && (
				<>
					<Debris />
					<BouncingReset
						onClick={() => {
							setTurbo(false);
							setSmashed(new Set()); // repairs every busted cartridge
							blip("close");
						}}
					/>
				</>
			)}

			{secretOpen && <SecretModal progress={konamiPos} onClose={() => setSecretOpen(false)} />}

			{openRecipe && (
				<>
					<RecipeDetail key={openRecipe.id} recipe={openRecipe} tally={tallies[openRecipe.id]} mine={mine[openRecipe.id]} onVote={cast} onClose={close} />
					<PrintSheet recipe={openRecipe} />
				</>
			)}
		</div>
	);
}
