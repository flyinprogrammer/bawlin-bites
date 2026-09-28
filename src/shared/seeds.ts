// One-time data changes applied by the Worker on its next start (see runSeeds in
// src/worker/index.ts). Never edit a seed that has shipped; add a new one with a new name.
export const SEEDS: { name: string; approve: string[] }[] = [
	{
		// Recipes the family sent in from their own cooking, Sept 2026.
		name: "2026-09-28-family-uploads-tested",
		approve: [
			"choco-orange-power-pellet",
			"fruit-stand-bites",
			"carrot-cake-cart",
			"mango-bliss-bonus",
			"choco-sprinkle-bomb",
			"cranberry-easy-mode",
			"pumpkin-power-up",
		],
	},
];
