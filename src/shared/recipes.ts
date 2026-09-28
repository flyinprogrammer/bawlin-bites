// The recipe "cartridges". Shared by the React app (rendering) and the Worker
// (validating which recipe ids can be voted on).

import type { WeightKey } from "./weights";

export type Stat = 1 | 2 | 3 | 4 | 5;

export interface Ingredient {
	/** Parsed by src/shared/quantity.ts: "1¼ cups", "2 tbsp", "½ tsp", "1", "pinch", "optional". */
	qty: string;
	item: string;
	/** Plural item name for counted ingredients ("lemons") when batch-scaled past 1. */
	plural?: string;
	/** Key into WEIGHTS (grams per cup); only set where the density is verified. */
	weigh?: WeightKey;
	/**
	 * Grams for a single batch as printed on the source recipe card. The author's own
	 * number beats a generic density chart, so it wins over `weigh` (never set both).
	 */
	cardGrams?: number;
	/** Must never contain an amount: notes don't get batch-scaled. */
	note?: string;
}

export interface Recipe {
	/** URL slug + vote key. Derived from `name`, never written by hand. */
	id: string;
	name: string;
	tagline: string;
	/** Minutes of hands-on time. */
	prepMins: number;
	/** Minutes including chill time. */
	totalMins: number;
	makes: string;
	/** 1 = toddler-proof, 3 = you'll need a food processor and patience. */
	difficulty: 1 | 2 | 3;
	stats: { energy: Stat; sweet: Stat; crunch: Stat };
	tags: string[];
	/** Colors for the procedurally drawn pixel ball. */
	art: { body: string; shade: string; bits: "chips" | "flakes" | "seeds" | "crumbs" | "zest" | "none"; bitColor: string };
	ingredients: Ingredient[];
	steps: string[];
	tip?: string;
	source?: { name: string; url: string };
	/** A "bonus pack" plug shown on the recipe screen. */
	promo?: { title: string; blurb: string; cta: string; url: string };
	/**
	 * The kaiju's favorite: in turbo it refuses to smash this one, says this
	 * line, and crowns it the #1 card instead.
	 */
	kaijuFave?: string;
}

const WELL_PLATED = { name: "Well Plated by Erin Clarke", url: "https://www.wellplated.com/energy-balls/" };

// Well Plated's base: oats + power mix-ins + nut butter + sticky sweetener + vanilla + salt + ½ cup mix-ins.
const oatBaseSteps = [
	"Dump everything into a big bowl and stir until it looks like a sticky, lumpy dough.",
	"Squeeze a bit in your fist. Crumbly? Add a spoon more nut butter. Soggy? Add a spoon more oats.",
	"Chill the bowl in the fridge for 30 minutes so the dough firms up.",
	"Scoop and roll into 1-inch balls (a small cookie scoop makes this go fast).",
	"Eat now, or stash in an airtight container in the fridge for up to 2 weeks (freezer: 3 months).",
];
const oatBaseTip = "Nut allergy? Sunflower seed butter works in place of the peanut or almond butter.";

// Verified weights for the base's swappable binders, by exact wording. "any nut butter" and
// "honey or maple syrup" stay weightless on purpose: the options differ by more than 5%.
const BINDER_WEIGHTS: Partial<Record<string, WeightKey>> = {
	"peanut butter": "peanutButter",
	"almond butter": "almondCashewButter",
	"almond or cashew butter": "almondCashewButter",
	honey: "honey",
	"maple syrup": "mapleSyrup",
};

function oatBase(opts: { oats?: string; butter: string; sweetener: string; extras: Ingredient[] }): Ingredient[] {
	return [
		{ qty: opts.oats ?? "1¼ cups", item: "old-fashioned rolled oats", note: "quick oats work too" },
		{ qty: "2 tbsp", item: "chia, flax, or hemp seeds", note: "or more oats" },
		{ qty: "½ cup", item: opts.butter, weigh: BINDER_WEIGHTS[opts.butter] },
		{ qty: "⅓ cup", item: opts.sweetener, weigh: BINDER_WEIGHTS[opts.sweetener] },
		{ qty: "1 tsp", item: "vanilla extract" },
		{ qty: "¼ tsp", item: "kosher salt" },
		...opts.extras,
	];
}

const defs: Omit<Recipe, "id">[] = [
	{
		name: "Classic Chip",
		tagline: "Player 1. The default skin. Still undefeated.",
		prepMins: 10,
		totalMins: 40,
		makes: "~18 balls",
		difficulty: 1,
		stats: { energy: 4, sweet: 3, crunch: 2 },
		tags: ["oats", "chocolate", "nut butter"],
		art: { body: "#c8955a", shade: "#6b4423", bits: "chips", bitColor: "#2a1a10" },
		ingredients: oatBase({
			butter: "any nut butter",
			sweetener: "honey",
			extras: [{ qty: "½ cup", item: "chocolate chips", weigh: "chocolateChips" }],
		}),
		steps: oatBaseSteps,
		tip: oatBaseTip,
		source: WELL_PLATED,
	},
	{
		name: "Trail Mix",
		tagline: "Side quest snack. Pockets not included.",
		prepMins: 10,
		totalMins: 40,
		makes: "~18 balls",
		difficulty: 1,
		stats: { energy: 5, sweet: 3, crunch: 4 },
		tags: ["oats", "peanut", "chocolate"],
		art: { body: "#b98552", shade: "#5c3a1c", bits: "crumbs", bitColor: "#3a220f" },
		ingredients: oatBase({
			butter: "peanut butter",
			sweetener: "honey",
			extras: [
				{ qty: "3 tbsp", item: "chocolate chips", weigh: "chocolateChips" },
				{ qty: "3 tbsp", item: "chopped peanuts" },
				{ qty: "2 tbsp", item: "raisins" },
			],
		}),
		steps: oatBaseSteps,
		tip: oatBaseTip,
		source: WELL_PLATED,
	},
	{
		name: "Cran-Snow Combo",
		tagline: "White chocolate + cranberry. Seasonal event, all year.",
		prepMins: 10,
		totalMins: 40,
		makes: "~18 balls",
		difficulty: 1,
		stats: { energy: 3, sweet: 4, crunch: 2 },
		tags: ["oats", "almond", "fruit", "chocolate"],
		art: { body: "#d9b07e", shade: "#8a5a32", bits: "chips", bitColor: "#b3243a" },
		ingredients: oatBase({
			butter: "almond or cashew butter",
			sweetener: "honey",
			extras: [
				{ qty: "¼ cup", item: "dried cranberries" },
				{ qty: "¼ cup", item: "white chocolate chips", weigh: "whiteChocolateChips" },
			],
		}),
		steps: oatBaseSteps,
		tip: oatBaseTip,
		source: WELL_PLATED,
	},
	{
		name: "Almond Joy-stick",
		tagline: "Coconut, almond, chocolate. Press ↑↑↓↓ for extra joy.",
		prepMins: 10,
		totalMins: 40,
		makes: "~18 balls",
		difficulty: 1,
		stats: { energy: 4, sweet: 3, crunch: 3 },
		tags: ["oats", "coconut", "almond", "chocolate"],
		art: { body: "#e6cfa6", shade: "#8f6a3e", bits: "flakes", bitColor: "#ffffff" },
		ingredients: oatBase({
			oats: "¾ cup",
			butter: "almond butter",
			sweetener: "honey or maple syrup",
			extras: [
				{ qty: "½ cup", item: "unsweetened coconut flakes", weigh: "coconutFlakes", note: "stands in for some of the oats" },
				{ qty: "¼ cup", item: "chocolate chips", weigh: "chocolateChips" },
				{ qty: "¼ cup", item: "chopped almonds" },
			],
		}),
		steps: oatBaseSteps,
		tip: oatBaseTip,
		source: WELL_PLATED,
	},
	{
		name: "Double Choc Boss",
		tagline: "Cocoa dough, mini chips. Final boss energy.",
		prepMins: 10,
		totalMins: 40,
		makes: "~18 balls",
		difficulty: 1,
		stats: { energy: 4, sweet: 4, crunch: 2 },
		tags: ["oats", "chocolate", "nut butter"],
		art: { body: "#5a3521", shade: "#241208", bits: "chips", bitColor: "#120804" },
		ingredients: oatBase({
			butter: "any nut butter",
			sweetener: "honey or maple syrup",
			extras: [
				{ qty: "½ cup", item: "mini chocolate chips", weigh: "miniChocolateChips" },
				{ qty: "2 tbsp", item: "cocoa powder", weigh: "cocoaPowder" },
			],
		}),
		steps: oatBaseSteps,
		tip: oatBaseTip,
		source: WELL_PLATED,
	},
	{
		name: "Oatmeal Raisin Cookie",
		tagline: "Looks like chocolate chip. It is not. Beloved anyway.",
		prepMins: 10,
		totalMins: 40,
		makes: "~18 balls",
		difficulty: 1,
		stats: { energy: 4, sweet: 3, crunch: 2 },
		tags: ["oats", "almond", "fruit"],
		art: { body: "#cf9f68", shade: "#7a4f28", bits: "crumbs", bitColor: "#3b1d2a" },
		ingredients: oatBase({
			butter: "almond or cashew butter",
			sweetener: "maple syrup",
			extras: [
				{ qty: "½ cup", item: "raisins" },
				{ qty: "¼ tsp", item: "ground cinnamon" },
			],
		}),
		steps: oatBaseSteps,
		tip: oatBaseTip,
		source: WELL_PLATED,
	},
	{
		name: "Choco-Orange Power Pellet",
		tagline: "Chocolate + orange zest. Tiny hands approved.",
		prepMins: 15,
		totalMins: 15,
		makes: "5 servings",
		difficulty: 1,
		stats: { energy: 4, sweet: 4, crunch: 2 },
		tags: ["dates", "walnut", "chocolate", "fruit", "no oats", "kid-made"],
		art: { body: "#5b3320", shade: "#24120a", bits: "zest", bitColor: "#ff8a1f" },
		ingredients: [
			{ qty: "1⅓ cups", item: "dates", note: "pitted" },
			{ qty: "1 cup", item: "walnuts" },
			{ qty: "¼ cup", item: "cacao or cocoa powder" },
			{ qty: "1 tbsp", item: "orange zest", note: "or to taste" },
			{ qty: "1 tsp", item: "vanilla extract" },
		],
		steps: [
			"Put everything in a food processor. Kids can be in charge of zesting and the ON button.",
			"Process until the walnuts start to release their oils and the mix turns into a sticky dough.",
			"Roll into small balls. Let the littles do the rolling; wonky balls taste the same.",
		],
		tip: "Serving toddlers? These are chewy, so break them into small pieces and serve while they're sitting down.",
		source: { name: "Kids Eat in Color", url: "https://kidseatincolor.com/no-bake-chocolate-orange-date-balls/" },
		promo: {
			title: "BONUS PACK UNLOCKED",
			blurb:
				"Liked this one? Kids Eat in Color's Real Easy Mealtime Bundle packs Real Easy Weekdays, Everyday Snacks and Everyday Lunches: a whole meal system of dietitian-made recipes and snack ideas for busy families.",
			cta: "GET THE BUNDLE ▶",
			url: "https://kidseatincolor.com/product/mealtime-bundle/",
		},
	},
	{
		name: "Fruit Stand Bites",
		tagline: "Nuts, dates, dried fruit. Three-ingredient speedrun. Toddler-tested.",
		prepMins: 20,
		totalMins: 20,
		makes: "~24 bites",
		difficulty: 1,
		stats: { energy: 4, sweet: 3, crunch: 2 },
		tags: ["dates", "cashew", "almond", "coconut", "fruit", "oats", "kid-made"],
		art: { body: "#c99a62", shade: "#6a4520", bits: "chips", bitColor: "#9b1c2e" },
		ingredients: [
			{ qty: "1½ cups", item: "cashews or almonds", note: "raw or roasted, unsalted" },
			{ qty: "½ cup", item: "pitted dates", note: "Medjool or Deglet Noor" },
			{ qty: "½ cup", item: "dried cherries", note: "or cranberries, apples, apricots, raisins, or prunes" },
			{ qty: "3 tbsp", item: "shredded unsweetened coconut" },
			{ qty: "3 tbsp", item: "rolled oats" },
			{ qty: "optional", item: "extra shredded coconut", note: "for rolling" },
		],
		steps: [
			"Cover the nuts with hot water in a bowl and let them soften for about 10 minutes, then drain well.",
			"Pulse the nuts, oats, and coconut in a food processor until finely chopped.",
			"Add the dates and dried fruit. Process until it sticks together when you pinch it.",
			"Roll into bite-size balls (roll them in extra coconut if you like).",
			"Store in the fridge in an airtight container. They keep for weeks.",
		],
		tip: "For little kids, grind the nuts extra fine and keep the bites small.",
		source: { name: "Yummy Toddler Food", url: "https://www.yummytoddlerfood.com/no-bake-energy-balls-with-fruit/" },
		promo: {
			title: "BONUS PACK UNLOCKED",
			blurb:
				"Amy Palanjian's bestselling cookbook, Yummy Toddler Food: Dinnertime SOS, has 100 sanity-saving meals that the whole family will actually eat, all fast or make-ahead.",
			cta: "GET THE COOKBOOK ▶",
			url: "https://www.yummytoddlerfood.com/dinnertime-sos/",
		},
	},
	{
		name: "Coconut Snowball",
		tagline: "Dates + cashews rolled in snow. Zero snow.",
		prepMins: 15,
		totalMins: 15,
		makes: "~16 balls",
		difficulty: 2,
		stats: { energy: 3, sweet: 4, crunch: 1 },
		tags: ["dates", "cashew", "coconut", "no oats"],
		art: { body: "#f4ecdc", shade: "#b8a47e", bits: "flakes", bitColor: "#ffffff" },
		ingredients: [
			{ qty: "1 cup", item: "Medjool dates", note: "pitted, packed" },
			{ qty: "1 cup", item: "raw cashews" },
			{ qty: "½ cup", item: "unsweetened shredded coconut", note: "plus more for rolling" },
			{ qty: "1 tsp", item: "vanilla extract" },
			{ qty: "pinch", item: "flaky salt" },
		],
		steps: [
			"Pulse the cashews in a food processor until they look like coarse sand.",
			"Add dates, coconut, vanilla, and salt. Blitz until it clumps into one sticky ball.",
			"Roll into 1-inch balls, then roll each one in extra coconut.",
			"Fridge for 20 minutes if you can wait. You probably can't.",
		],
		tip: "Dates dry as a boss? Soak them in hot water for 10 minutes, then drain well.",
	},
	{
		name: "Brownie Batter Bomb",
		tagline: "Tastes like licking the spatula. Legally.",
		prepMins: 15,
		totalMins: 15,
		makes: "~14 balls",
		difficulty: 2,
		stats: { energy: 4, sweet: 5, crunch: 2 },
		tags: ["dates", "walnut", "chocolate", "no oats"],
		art: { body: "#4a2c1d", shade: "#1e0f08", bits: "crumbs", bitColor: "#8a6a4a" },
		ingredients: [
			{ qty: "1 cup", item: "walnuts" },
			{ qty: "1¼ cups", item: "Medjool dates", note: "pitted" },
			{ qty: "¼ cup", item: "cocoa powder", weigh: "cocoaPowder" },
			{ qty: "½ tsp", item: "instant espresso powder", note: "optional, makes it taste more chocolatey" },
			{ qty: "¼ tsp", item: "sea salt" },
		],
		steps: [
			"Pulse walnuts in a food processor into small crumbs.",
			"Add dates, cocoa, espresso, and salt. Process until the dough pulls together.",
			"Roll into balls. Dust with extra cocoa for a truffle look.",
		],
	},
	{
		name: "Lemon Bar Blaster",
		tagline: "Bright, zippy, pucker-up power-up.",
		prepMins: 15,
		totalMins: 15,
		makes: "~16 balls",
		difficulty: 2,
		stats: { energy: 3, sweet: 3, crunch: 1 },
		tags: ["dates", "cashew", "coconut", "fruit", "no oats"],
		art: { body: "#f6e27a", shade: "#b89a2a", bits: "zest", bitColor: "#fff7b0" },
		ingredients: [
			{ qty: "1½ cups", item: "raw cashews" },
			{ qty: "¾ cup", item: "Medjool dates", note: "pitted" },
			{ qty: "¼ cup", item: "unsweetened shredded coconut" },
			{ qty: "1", item: "lemon, zested", plural: "lemons, zested" },
			{ qty: "2 tbsp", item: "fresh lemon juice" },
			{ qty: "pinch", item: "salt" },
		],
		steps: [
			"Blitz cashews and coconut until finely ground.",
			"Add dates, lemon zest, lemon juice, and salt. Process until sticky.",
			"Roll into balls. Extra zest on top if you're feeling fancy.",
		],
	},
	{
		name: "Carrot Cake Cart",
		tagline: "Technically a vegetable. Technically. Now on a stick.",
		kaijuFave: "WHOA WHOA. not the carrot cake. i'm a bunny, not a monster. 🥕",
		prepMins: 15,
		totalMins: 15,
		makes: "~12 pops",
		difficulty: 2,
		stats: { energy: 3, sweet: 3, crunch: 2 },
		tags: ["dates", "pecan", "coconut", "no oats", "kid-made"],
		art: { body: "#d98a3d", shade: "#7c4318", bits: "flakes", bitColor: "#fff4e0" },
		// Ingredients (and their gram weights) straight from the family's recipe card.
		ingredients: [
			{ qty: "½ cup", item: "dates", note: "pitted", cardGrams: 90 },
			{ qty: "½ cup", item: "shredded carrots", cardGrams: 60 },
			{ qty: "½ cup", item: "pecans", cardGrams: 50 },
			{ qty: "⅓ cup", item: "desiccated or shredded coconut", cardGrams: 30 },
			{ qty: "1 tsp", item: "vanilla" },
			{ qty: "1 tsp", item: "cinnamon" },
			{ qty: "1 tsp", item: "nutmeg" },
			{ qty: "1 tsp", item: "sea salt" },
			{ qty: "as needed", item: "lollipop sticks" },
			{ qty: "optional", item: "Greek yogurt, to dip" },
		],
		steps: [
			"Pulse the pecans in a food processor until finely chopped.",
			"Add the dates, carrots, coconut, vanilla, cinnamon, nutmeg, and salt. Process until the mix sticks together when pinched.",
			"Roll into 1-inch balls and push a lollipop stick into each one.",
			"Dunk in Greek yogurt if you like, then chill until firm. Keep them in the fridge (the carrot is real).",
		],
	},
	{
		name: "Matcha Mode",
		tagline: "Green screen. Calm focus. Suspiciously powerful.",
		prepMins: 15,
		totalMins: 15,
		makes: "~14 balls",
		difficulty: 2,
		stats: { energy: 5, sweet: 3, crunch: 1 },
		tags: ["dates", "cashew", "coconut", "no oats"],
		art: { body: "#8fb35a", shade: "#3f5a1f", bits: "flakes", bitColor: "#e8f5c8" },
		ingredients: [
			{ qty: "1 cup", item: "raw cashews" },
			{ qty: "1 cup", item: "Medjool dates", note: "pitted" },
			{ qty: "¼ cup", item: "shredded coconut" },
			{ qty: "2 tsp", item: "matcha powder", note: "plus a little for dusting" },
			{ qty: "1 tbsp", item: "coconut oil", weigh: "coconutOil", note: "melted" },
		],
		steps: [
			"Process cashews and coconut to a fine crumb.",
			"Add dates, matcha, and coconut oil. Process until it forms a dough.",
			"Roll into balls, dust with matcha through a little sieve.",
		],
		tip: "Heads up: matcha has caffeine. These are actual energy balls.",
	},
	{
		name: "Salty Pretzel Combo",
		tagline: "Caramel-y dates, crunchy pretzel. Combo multiplier ×2.",
		prepMins: 15,
		totalMins: 15,
		makes: "~16 balls",
		difficulty: 2,
		stats: { energy: 3, sweet: 4, crunch: 5 },
		tags: ["dates", "pecan", "crunchy"],
		art: { body: "#b0703a", shade: "#5a3312", bits: "crumbs", bitColor: "#f2e3c0" },
		ingredients: [
			{ qty: "1 cup", item: "pecans" },
			{ qty: "1¼ cups", item: "Medjool dates", note: "pitted" },
			{ qty: "1 tsp", item: "vanilla extract" },
			{ qty: "½ tsp", item: "flaky sea salt" },
			{ qty: "¾ cup", item: "mini pretzels", note: "roughly crushed" },
		],
		steps: [
			"Pulse pecans into crumbs.",
			"Add dates, vanilla, and salt; process until it tastes like caramel (it will).",
			"Fold in the crushed pretzels by hand so they stay crunchy.",
			"Roll into balls. Press a few extra pretzel bits on top.",
		],
		tip: "Pretzels have gluten. Swap gluten-free pretzels if you need to.",
	},
	{
		name: "Cherry Bomb",
		tagline: "Dark chocolate + tart cherry. Explodes with flavor (not literally).",
		prepMins: 15,
		totalMins: 15,
		makes: "~16 balls",
		difficulty: 2,
		stats: { energy: 4, sweet: 4, crunch: 3 },
		tags: ["dates", "almond", "chocolate", "fruit", "no oats"],
		art: { body: "#6b2a2a", shade: "#2c0d0f", bits: "chips", bitColor: "#d6304a" },
		ingredients: [
			{ qty: "1 cup", item: "almonds", weigh: "wholeAlmonds" },
			{ qty: "1 cup", item: "Medjool dates", note: "pitted" },
			{ qty: "½ cup", item: "dried tart cherries" },
			{ qty: "3 tbsp", item: "cocoa powder", weigh: "cocoaPowder" },
			{ qty: "¼ tsp", item: "almond extract", note: "optional" },
			{ qty: "pinch", item: "salt" },
		],
		steps: [
			"Pulse almonds into small bits (not flour — keep a little crunch).",
			"Add dates, cocoa, almond extract, and salt. Process until sticky.",
			"Add cherries and pulse a few times so they stay chunky.",
			"Roll into balls.",
		],
	},
	{
		name: "Snickerdoodle Safe Mode",
		tagline: "Nut-free. School-safe. Cinnamon-sugar cheat code.",
		prepMins: 10,
		totalMins: 40,
		makes: "~18 balls",
		difficulty: 1,
		stats: { energy: 4, sweet: 4, crunch: 2 },
		tags: ["oats", "nut-free", "kid-made"],
		art: { body: "#dcae72", shade: "#8a5a2b", bits: "crumbs", bitColor: "#6b3418" },
		ingredients: [
			{ qty: "1¼ cups", item: "old-fashioned rolled oats" },
			{ qty: "2 tbsp", item: "hemp hearts or ground flax" },
			{ qty: "½ cup", item: "sunflower seed butter", weigh: "sunflowerButter", note: "stir it well first" },
			{ qty: "⅓ cup", item: "maple syrup or honey" },
			{ qty: "1 tsp", item: "vanilla extract" },
			{ qty: "1 tsp", item: "ground cinnamon" },
			{ qty: "pinch", item: "salt" },
			{ qty: "2 tbsp", item: "granulated sugar", weigh: "sugar", note: "for rolling" },
			{ qty: "1 tsp", item: "ground cinnamon", note: "for rolling" },
		],
		steps: [
			"Stir the oats, hemp hearts, sunflower seed butter, maple syrup, vanilla, cinnamon, and salt in a bowl until it clumps.",
			"Too crumbly? Add a spoon more sunflower seed butter. Too sticky? A spoon more oats.",
			"Chill the bowl for 30 minutes so it's easier to roll.",
			"Roll into 1-inch balls, then roll each one in the cinnamon sugar.",
			"Store in the fridge in an airtight container for up to 2 weeks.",
		],
		tip: "Packing these for school? Check that your oats and sunflower seed butter are made in a nut-free facility.",
	},
];

export function slugify(name: string) {
	return name
		.normalize("NFKD")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

export const recipes: Recipe[] = defs.map((r) => ({ ...r, id: slugify(r.name) }));

/**
 * Old slug -> current slug. When a recipe is renamed, add its old slug here so
 * existing links redirect and its votes get carried over.
 */
export const RENAMED: Record<string, string> = {
	"white-choc-cranberry": "cran-snow-combo",
	"almond-joy": "almond-joy-stick",
	"double-chocolate": "double-choc-boss",
	"oatmeal-raisin": "oatmeal-raisin-cookie",
	"chocolate-orange": "choco-orange-power-pellet",
	"fruit-stand": "fruit-stand-bites",
	"brownie-batter": "brownie-batter-bomb",
	"lemon-bar": "lemon-bar-blaster",
	"carrot-cake": "carrot-cake-cart",
	"matcha-cashew": "matcha-mode",
	"salted-caramel-pretzel": "salty-pretzel-combo",
};

/** Gear plug shown on recipes that need a food processor. */
export const FOOD_PROCESSOR = {
	name: "Cuisinart 14-Cup Food Processor",
	blurb: "The 14-cup Cuisinart turns dates and nuts into dough in about 30 seconds. Rolling a double batch? This is the one to get.",
	url: "https://www.amazon.com/Cuisinart-DFP-14BCNY-Processor-Brushed-Stainless/dp/B01AXM4WV2",
};

export function needsFoodProcessor(recipe: Recipe) {
	return recipe.steps.some((s) => /food processor|process|blitz|pulse/i.test(s));
}

export const recipeIds = new Set(recipes.map((r) => r.id));
