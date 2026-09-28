// Exact recipe-quantity math for batch scaling.
//
// Every volume is converted to an exact rational number of US teaspoons using the
// fixed US customary definitions (1 tbsp = 3 tsp, 1 cup = 16 tbsp = 48 tsp), scaled
// exactly (fraction.js, no floating point), and then written back out as the
// combination of real measuring cups/spoons that takes the fewest scoops.
// Nothing is ever rounded: the tests prove every displayed amount parses back to
// exactly the scaled amount.
import Fraction from "fraction.js";

export const TSP_PER = { tsp: 1, tbsp: 3, cup: 48 } as const;

/** Measuring cups a normal kitchen has, as fractions of a cup. */
export const CUP_MEASURES = ["1/4", "1/3", "1/2", "2/3", "3/4"].map((f) => new Fraction(f));

/** Ways to fill a partial cup: nothing, one measure, or two different measures (under 1 cup). */
const CUP_COMBOS: Fraction[][] = [[]];
for (let i = CUP_MEASURES.length - 1; i >= 0; i--) {
	CUP_COMBOS.push([CUP_MEASURES[i]]);
	for (let j = i - 1; j >= 0; j--) {
		if (CUP_MEASURES[i].add(CUP_MEASURES[j]).compare(1) < 0) CUP_COMBOS.push([CUP_MEASURES[i], CUP_MEASURES[j]]);
	}
}
/** Teaspoon-fraction spoons (⅛, ¼, ½ tsp) plus how many scoops each fractional remainder takes. */
const TSP_FRACTION_SCOOPS: Record<string, number> = {
	"0": 0,
	"1/8": 1,
	"1/4": 1,
	"3/8": 2, // ¼ + ⅛
	"1/2": 1,
	"5/8": 2, // ½ + ⅛
	"3/4": 2, // ½ + ¼
	"7/8": 3, // ½ + ¼ + ⅛
};

const VULGAR: Record<string, string> = {
	"½": "1/2",
	"⅓": "1/3",
	"⅔": "2/3",
	"¼": "1/4",
	"¾": "3/4",
	"⅛": "1/8",
	"⅜": "3/8",
	"⅝": "5/8",
	"⅞": "7/8",
};
const TO_VULGAR: Record<string, string> = Object.fromEntries(Object.entries(VULGAR).map(([k, v]) => [v, k]));

export type Qty =
	| { kind: "volume"; tsp: Fraction }
	| { kind: "count"; n: Fraction }
	| { kind: "weight"; g: number } // whole grams, for things the family weighs
	| { kind: "pinch"; n: Fraction }
	| { kind: "text"; text: string }; // "optional" / "as needed": never scaled

const NUMBER = "(\\d+)?([½⅓⅔¼¾⅛⅜⅝⅞])?";
const PART = new RegExp(`^${NUMBER}(?:\\s+(cups?|tbsp|tsp))?$`);

function parseNumber(whole: string | undefined, vulgar: string | undefined): Fraction {
	if (!whole && !vulgar) throw new Error("no number");
	let n = new Fraction(whole ? Number(whole) : 0);
	if (vulgar) n = n.add(new Fraction(VULGAR[vulgar]));
	return n;
}

/**
 * Parse a quantity exactly as written in recipes.ts ("1¼ cups", "⅓ cup", "2 tbsp",
 * "1", "pinch", "optional", or a formatted sum like "¼ cup + 2 tbsp").
 * Throws on anything it doesn't understand, so bad data fails the tests instead of
 * silently scaling wrong.
 */
export function parseQty(input: string): Qty {
	const s = input.trim();
	if (s === "optional" || s === "as needed") return { kind: "text", text: s };
	const grams = s.match(/^([1-9]\d*) g$/);
	if (grams) return { kind: "weight", g: Number(grams[1]) };
	const pinch = s.match(/^(\d+)?\s*pinch(?:es)?$/);
	if (pinch) return { kind: "pinch", n: new Fraction(pinch[1] ? Number(pinch[1]) : 1) };

	let tsp = new Fraction(0);
	let unitless: Fraction | null = null;
	for (const part of s.split(" + ")) {
		const m = part.trim().match(PART);
		if (!m) throw new Error(`Unparseable quantity: "${input}"`);
		const n = parseNumber(m[1], m[2]);
		const unit = m[3]?.replace(/s$/, "") as keyof typeof TSP_PER | undefined;
		if (!unit) {
			if (s.includes("+")) throw new Error(`Unitless part in sum: "${input}"`);
			unitless = n;
		} else {
			tsp = tsp.add(n.mul(TSP_PER[unit]));
		}
	}
	if (unitless) return { kind: "count", n: unitless };
	return { kind: "volume", tsp };
}

/** "1¾", "⅔", "3": a mixed number with a vulgar fraction. Throws if not a kitchen fraction. */
export function formatNumber(n: Fraction): string {
	const whole = n.floor();
	const frac = n.sub(whole);
	if (frac.equals(0)) return whole.toString();
	const glyph = TO_VULGAR[frac.toFraction()];
	if (!glyph) throw new Error(`No kitchen fraction for ${n.toFraction()}`);
	return (whole.equals(0) ? "" : whole.toString()) + glyph;
}

interface Plan {
	wholeCups: Fraction;
	/** Up to two different measuring cups, largest first (e.g. ⅔ + ¼ for 11/12 cup). */
	cupMeasures: Fraction[];
	tbsp: number;
	tsp: Fraction; // < 3
	scoops: number;
}

/**
 * Express an exact teaspoon amount with real measuring tools, using the fewest
 * scoops (ties: less fiddly teaspoon measuring). Amounts must be multiples of ⅛ tsp,
 * which every recipe amount × whole-number batch size is.
 */
export function planVolume(totalTsp: Fraction): Plan {
	if (totalTsp.compare(0) <= 0) throw new Error("Volume must be positive");
	if (!totalTsp.mul(8).round().equals(totalTsp.mul(8))) throw new Error(`Not a multiple of ⅛ tsp: ${totalTsp.toFraction()}`);
	const wholeCups = totalTsp.div(TSP_PER.cup).floor();
	const rest = totalTsp.sub(wholeCups.mul(TSP_PER.cup));

	let best: Plan | null = null;
	for (const combo of CUP_COMBOS) {
		const cupTsp = combo.reduce((sum, f) => sum.add(f), new Fraction(0)).mul(TSP_PER.cup);
		if (cupTsp.compare(rest) > 0) continue;
		const left = rest.sub(cupTsp);
		const tbsp = left.div(TSP_PER.tbsp).floor().valueOf();
		const tsp = left.sub(tbsp * TSP_PER.tbsp);
		const tspWhole = tsp.floor().valueOf();
		const fracScoops = TSP_FRACTION_SCOOPS[tsp.sub(tspWhole).toFraction()];
		if (fracScoops === undefined) continue;
		const scoops = wholeCups.valueOf() + combo.length + tbsp + tspWhole + fracScoops;
		const plan = { wholeCups, cupMeasures: combo, tbsp, tsp, scoops };
		// Fewest scoops; ties go to less teaspoon fiddling, then fewer cups.
		if (
			!best ||
			scoops < best.scoops ||
			(scoops === best.scoops && (tsp.compare(best.tsp) < 0 || (tsp.equals(best.tsp) && combo.length < best.cupMeasures.length)))
		)
			best = plan;
	}
	if (!best) throw new Error(`Can't measure ${totalTsp.toFraction()} tsp`);
	return best;
}

export function formatVolume(totalTsp: Fraction): string {
	const { wholeCups, cupMeasures, tbsp, tsp } = planVolume(totalTsp);
	const parts: string[] = [];
	// First cup measure folds into the whole cups ("1⅔ cups"); a second one is listed on its own ("+ ¼ cup").
	const [first, second] = cupMeasures;
	const cups = first ? wholeCups.add(first) : wholeCups;
	if (!cups.equals(0)) parts.push(`${formatNumber(cups)} ${cups.compare(1) > 0 ? "cups" : "cup"}`);
	if (second) parts.push(`${formatNumber(second)} cup`);
	if (tbsp) parts.push(`${tbsp} tbsp`);
	if (!tsp.equals(0)) parts.push(`${formatNumber(tsp)} tsp`);
	return parts.join(" + ");
}

/** The quantity string for `qty` made `times` times over (whole-number batches only). */
export function scaleQty(qty: string, times: number): string {
	if (!Number.isInteger(times) || times < 1) throw new Error("Batch size must be a whole number ≥ 1");
	const q = parseQty(qty);
	if (times === 1) return qty; // exactly as the recipe author wrote it
	switch (q.kind) {
		case "text":
			return q.text;
		case "pinch": {
			const n = q.n.mul(times);
			return `${formatNumber(n)} ${n.equals(1) ? "pinch" : "pinches"}`;
		}
		case "count":
			return formatNumber(q.n.mul(times));
		case "weight":
			return `${q.g * times} g`;
		case "volume":
			return formatVolume(q.tsp.mul(times));
	}
}

/** Exact volume in cups (for weight conversion), or null if not a volume. */
export function volumeInCups(qty: string, times: number): Fraction | null {
	const q = parseQty(qty);
	return q.kind === "volume" ? q.tsp.mul(times).div(TSP_PER.cup) : null;
}

/** "~18 balls" × 2 → "~36 balls"; "5 servings" × 3 → "15 servings". */
export function scaleMakes(makes: string, times: number): string {
	const m = makes.match(/^(~?)(\d+) (.+)$/);
	if (!m) throw new Error(`Unparseable yield: "${makes}"`);
	return `${m[1]}${Number(m[2]) * times} ${m[3]}`;
}

/** Below this a kitchen scale isn't accurate enough; stick to spoons. */
const MIN_WEIGH_TSP = TSP_PER.tbsp;

/**
 * Approximate grams for a verified-density volume, rounded to the gram, or null when
 * we shouldn't give a weight (no verified density, not a volume, or under 1 tbsp).
 */
export function gramsFor(qty: string, times: number, gPerCup: number | undefined): number | null {
	const q = parseQty(qty);
	if (q.kind === "weight") return q.g * times; // already weighed: exact, no density needed
	if (!gPerCup || q.kind !== "volume") return null;
	const total = q.tsp.mul(times);
	if (total.compare(MIN_WEIGH_TSP) < 0) return null;
	return Math.round(total.div(TSP_PER.cup).mul(gPerCup).valueOf());
}
