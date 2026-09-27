import { gramsFor, parseQty, scaleMakes, scaleQty, TSP_PER } from "../shared/quantity";
import type { Ingredient, Recipe } from "../shared/recipes";
import { WEIGHTS } from "../shared/weights";

export const BATCHES = [
	{ times: 1, label: "1×", name: "Single batch" },
	{ times: 2, label: "2×", name: "Double batch" },
	{ times: 3, label: "3×", name: "Triple batch" },
] as const;

/** An ingredient line for a given batch size: exact quantity, plural-aware name, verified grams (or null). */
export function scaledIngredient(ing: Ingredient, times: number) {
	const q = parseQty(ing.qty);
	const many = q.kind === "count" && !q.n.mul(times).equals(1);
	const grams = gramsFor(ing.qty, times, ing.weigh ? WEIGHTS[ing.weigh].gPerCup : undefined);
	// Why there's no weight, in kitchen terms.
	const noWeight =
		grams !== null ? null : q.kind !== "volume" ? "—" : q.tsp.mul(times).compare(TSP_PER.tbsp) < 0 ? "use spoons" : "use cups";
	return {
		qty: scaleQty(ing.qty, times),
		item: many && ing.plural ? ing.plural : ing.item,
		grams,
		noWeight,
	};
}

export const scaledMakes = (r: Recipe, times: number) => scaleMakes(r.makes, times);
