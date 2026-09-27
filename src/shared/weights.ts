// Grams per US cup, ONLY for ingredients where two independent references agree
// within 5% for exactly the form the recipe calls for. Everything else (oats, whole
// dates, nuts in halves, dried fruit, "X or Y" swaps with different densities, and
// anything under 1 tbsp) deliberately has no weight: use cups/spoons for those.
//
// Research notes, Sept 2026 (KA = King Arthur Baking ingredient weight chart,
// USDA = FoodData Central SR Legacy household measures). Rejected for disagreement:
// rolled oats (KA 89 vs USDA 81 g/cup), dried cranberries (114 vs 160), raw cashews
// (113 vs 137), walnut halves (100 vs 128), tart cherries (142 vs 160), grated carrot
// (99 vs 110), shredded coconut (85 vs 80), raisins (loose 147 vs packed 168).
export const WEIGHTS = {
	peanutButter: { gPerCup: 265, spreadPct: 4.7, sources: ["KA: ½ cup = 135 g", "USDA peanut butter, smooth: 1 cup = 258 g"] },
	almondCashewButter: {
		gPerCup: 256,
		spreadPct: 0,
		sources: ["USDA almond butter & cashew butter: 1 tbsp = 16 g", "Justin's / Artisana labels: 2 tbsp = 32 g"],
	},
	sunflowerButter: { gPerCup: 256, spreadPct: 0, sources: ["USDA sunflower seed butter: 1 tbsp = 16 g", "SunButter label: 2 tbsp = 32 g"] },
	honey: { gPerCup: 338, spreadPct: 0.9, sources: ["KA: 1 tbsp = 21 g", "USDA honey: 1 cup = 339 g"] },
	mapleSyrup: { gPerCup: 313, spreadPct: 1.0, sources: ["KA: ½ cup = 156 g", "USDA syrups, maple: 1 cup = 315 g"] },
	chocolateChips: { gPerCup: 170, spreadPct: 1.2, sources: ["KA: 1 cup = 170 g", "USDA semisweet chips: 1 cup = 168 g"] },
	miniChocolateChips: { gPerCup: 175, spreadPct: 2.3, sources: ["KA: 1 cup = 177 g", "USDA mini chips: 1 cup = 173 g"] },
	whiteChocolateChips: { gPerCup: 170, spreadPct: 0, sources: ["KA: 1 cup = 170 g", "USDA white chocolate chips: 1 cup = 170 g"] },
	cocoaPowder: { gPerCup: 85, spreadPct: 2.4, sources: ["KA: ½ cup = 42 g", "USDA cocoa, unsweetened: 1 cup = 86 g"] },
	wholeAlmonds: { gPerCup: 142, spreadPct: 0.7, sources: ["KA: whole almonds 1 cup = 142 g", "USDA almonds: 1 cup whole = 143 g"] },
	coconutFlakes: { gPerCup: 60, spreadPct: 0, sources: ["KA: large flake coconut 1 cup = 60 g", "Bob's Red Mill flaked: ¼ cup = 15 g"] },
	sugar: { gPerCup: 200, spreadPct: 1.0, sources: ["KA: 1 cup = 198 g", "USDA granulated sugar: 1 cup = 200 g"] },
	coconutOil: { gPerCup: 220, spreadPct: 3.7, sources: ["KA: ½ cup = 113 g", "USDA coconut oil: 1 cup = 218 g"] },
} as const satisfies Record<string, { gPerCup: number; spreadPct: number; sources: readonly string[] }>;

export type WeightKey = keyof typeof WEIGHTS;
