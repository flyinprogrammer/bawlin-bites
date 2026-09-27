import Fraction from "fraction.js";
import { describe, expect, it } from "vitest";
import { CUP_MEASURES, formatVolume, gramsFor, parseQty, planVolume, scaleMakes, scaleQty, TSP_PER } from "./quantity";
import { WEIGHTS } from "./weights";
import { recipes } from "./recipes";

const tsp = (qty: string) => {
	const q = parseQty(qty);
	if (q.kind !== "volume") throw new Error(`${qty} is not a volume`);
	return q.tsp;
};

describe("parseQty", () => {
	it.each([
		["1 tsp", 1],
		["¼ tsp", 0.25],
		["1 tbsp", 3],
		["2 tbsp", 6],
		["¼ cup", 12],
		["⅓ cup", 16],
		["½ cup", 24],
		["⅔ cup", 32],
		["¾ cup", 36],
		["1 cup", 48],
		["1¼ cups", 60],
		["1⅓ cups", 64],
		["1½ cups", 72],
		["¼ cup + 2 tbsp", 18],
		["1 cup + 1 tbsp + ½ tsp", 51.5],
	])("%s = %s tsp", (qty, expected) => {
		expect(tsp(qty).equals(new Fraction(expected))).toBe(true);
	});

	it("keeps thirds exact (no 0.333…)", () => {
		expect(tsp("⅓ cup").mul(3).equals(48)).toBe(true);
	});

	it("parses counts, pinches and text", () => {
		expect(parseQty("1")).toMatchObject({ kind: "count" });
		expect(parseQty("pinch")).toMatchObject({ kind: "pinch" });
		expect(parseQty("optional")).toEqual({ kind: "text", text: "optional" });
	});

	it.each(["a cup", "1 cupz", "1/2 cup", "0.5 cup", "", "1 oz", "2 + 1", "1 tbsp +"])("rejects %j", (bad) => {
		expect(() => parseQty(bad)).toThrow();
	});
});

describe("scaleQty: known answers", () => {
	it.each([
		// thirds and quarters of a cup
		["⅓ cup", 2, "⅔ cup"],
		["⅓ cup", 3, "1 cup"],
		["¼ cup", 2, "½ cup"],
		["¼ cup", 3, "¾ cup"],
		["½ cup", 3, "1½ cups"],
		["¾ cup", 2, "1½ cups"],
		["¾ cup", 3, "2¼ cups"],
		["1¼ cups", 2, "2½ cups"],
		["1¼ cups", 3, "3¾ cups"],
		["1⅓ cups", 2, "2⅔ cups"],
		["1⅓ cups", 3, "4 cups"],
		["1½ cups", 3, "4½ cups"],
		// spoons: teaspoons roll up into tablespoons, tablespoons into cups
		["1 tsp", 2, "2 tsp"],
		["1 tsp", 3, "1 tbsp"],
		["2 tsp", 3, "2 tbsp"],
		["½ tsp", 2, "1 tsp"],
		["½ tsp", 3, "1½ tsp"],
		["¼ tsp", 2, "½ tsp"],
		["¼ tsp", 3, "¾ tsp"],
		["1 tbsp", 2, "2 tbsp"],
		["1 tbsp", 3, "3 tbsp"],
		["2 tbsp", 2, "¼ cup"],
		["2 tbsp", 3, "¼ cup + 2 tbsp"],
		["3 tbsp", 2, "¼ cup + 2 tbsp"],
		["3 tbsp", 3, "½ cup + 1 tbsp"],
		// counts and pinches
		["1", 3, "3"],
		["pinch", 2, "2 pinches"],
		["optional", 3, "optional"],
	])("%s × %i = %s", (qty, times, expected) => {
		expect(scaleQty(qty, times)).toBe(expected);
	});

	it("leaves 1× exactly as written", () => {
		expect(scaleQty("1¼ cups", 1)).toBe("1¼ cups");
	});
});

describe("formatVolume: exhaustive", () => {
	// Every multiple of ⅛ tsp from ⅛ tsp up to 12 cups.
	const eighths = TSP_PER.cup * 12 * 8;
	const cupFractions = new Set(["0", ...CUP_MEASURES.map((f) => f.toFraction())]);
	const tspFractions = new Set(["0", "1/8", "1/4", "3/8", "1/2", "5/8", "3/4", "7/8"]);

	it(`round-trips all ${eighths} amounts exactly, using only real measuring tools`, () => {
		for (let k = 1; k <= eighths; k++) {
			const amount = new Fraction(k, 8);
			const text = formatVolume(amount);
			// 1) what we print is exactly the amount, never rounded
			expect(tsp(text).equals(amount), `${amount.toFraction()} tsp printed as "${text}"`).toBe(true);
			// 2) every part is a measure you can actually scoop
			const plan = planVolume(amount);
			expect(plan.cupMeasures.length <= 2, `${text}: at most two cup measures`).toBe(true);
			for (const c of plan.cupMeasures) expect(cupFractions.has(c.toFraction()), `${text}: cup measure`).toBe(true);
			expect(new Set(plan.cupMeasures.map((c) => c.toFraction())).size, `${text}: distinct cups`).toBe(plan.cupMeasures.length);
			expect(Number.isInteger(plan.tbsp) && plan.tbsp >= 0 && plan.tbsp <= 3, `${text}: tbsp`).toBe(true);
			expect(plan.tsp.compare(3) < 0, `${text}: tsp < 1 tbsp`).toBe(true);
			expect(tspFractions.has(plan.tsp.sub(plan.tsp.floor()).toFraction()), `${text}: tsp fraction`).toBe(true);
		}
	});

	it("never prints 3+ teaspoons (that's a tablespoon) or 4+ tablespoons (that's ¼ cup)", () => {
		for (let k = 1; k <= 48 * 8; k++) {
			const text = formatVolume(new Fraction(k, 8));
			for (const part of text.split(" + ")) {
				const [amount, unit] = part.split(" ");
				if (unit === "tsp") expect(tsp(`${amount} tsp`).compare(3) < 0, text).toBe(true);
				if (unit === "tbsp") expect(Number(amount) <= 3, text).toBe(true);
			}
		}
	});

	it("uses two measuring cups when that beats spoons", () => {
		expect(formatVolume(new Fraction(44))).toBe("⅔ cup + ¼ cup"); // 11/12 cup
		expect(formatVolume(new Fraction(40))).toBe("½ cup + ⅓ cup"); // 5/6 cup
	});

	it("rejects amounts that aren't measurable", () => {
		expect(() => formatVolume(new Fraction(1, 3))).toThrow();
		expect(() => formatVolume(new Fraction(0))).toThrow();
	});
});

describe("every recipe", () => {
	const AMOUNT = /(\d|[½⅓⅔¼¾⅛⅜⅝⅞])\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|grams?|g|oz|ounces?|ml)\b/i;

	for (const r of recipes) {
		describe(r.name, () => {
			it("has parseable, exactly scalable quantities for 1×, 2× and 3× batches", () => {
				for (const ing of r.ingredients) {
					const q = parseQty(ing.qty);
					for (const times of [1, 2, 3]) {
						const scaled = scaleQty(ing.qty, times);
						const back = parseQty(scaled);
						if (q.kind === "volume") {
							expect(back.kind).toBe("volume");
							expect((back as { tsp: Fraction }).tsp.equals(q.tsp.mul(times)), `${ing.qty} × ${times} → ${scaled}`).toBe(true);
						}
						if (q.kind === "count" || q.kind === "pinch") {
							expect((back as { n: Fraction }).n.equals(q.n.mul(times))).toBe(true);
						}
					}
					if (q.kind === "count") expect(ing.plural, `${ing.item} needs a plural`).toBeTruthy();
				}
			});

			it("keeps amounts out of text that doesn't get scaled", () => {
				for (const ing of r.ingredients) {
					expect(ing.item, ing.item).not.toMatch(AMOUNT);
					expect(ing.note ?? "", ing.note).not.toMatch(AMOUNT);
				}
				for (const step of r.steps) expect(step, step).not.toMatch(AMOUNT);
				expect(r.tip ?? "").not.toMatch(AMOUNT);
			});

			it("has a scalable yield", () => {
				expect(scaleMakes(r.makes, 2)).not.toBe(r.makes);
			});
		});
	}
});

describe("scaleMakes", () => {
	it.each([
		["~18 balls", 2, "~36 balls"],
		["5 servings", 3, "15 servings"],
		["~24 bites", 3, "~72 bites"],
	])("%s × %i = %s", (makes, times, expected) => {
		expect(scaleMakes(makes, times)).toBe(expected);
	});
});

describe("grams", () => {
	it.each([
		// qty, times, g/cup, expected grams
		["½ cup", 1, WEIGHTS.peanutButter.gPerCup, 133], // 132.5 → 133
		["½ cup", 2, WEIGHTS.peanutButter.gPerCup, 265],
		["⅓ cup", 1, WEIGHTS.honey.gPerCup, 113], // 338/3 = 112.67
		["⅓ cup", 3, WEIGHTS.honey.gPerCup, 338],
		["¼ cup", 1, WEIGHTS.cocoaPowder.gPerCup, 21], // 21.25
		["3 tbsp", 1, WEIGHTS.chocolateChips.gPerCup, 32], // 170 × 3/16 = 31.875
		["1 tbsp", 1, WEIGHTS.coconutOil.gPerCup, 14], // 13.75
		["1 cup", 3, WEIGHTS.wholeAlmonds.gPerCup, 426],
	])("%s × %i at %i g/cup ≈ %i g", (qty, times, gPerCup, expected) => {
		expect(gramsFor(qty, times, gPerCup)).toBe(expected);
	});

	it("never weighs less than a tablespoon, counts, pinches, or unverified ingredients", () => {
		expect(gramsFor("2 tsp", 1, 256)).toBeNull();
		expect(gramsFor("1 tsp", 3, 256)).toBe(16); // 3× → 1 tbsp: now worth weighing
		expect(gramsFor("1", 2, 256)).toBeNull();
		expect(gramsFor("pinch", 3, 256)).toBeNull();
		expect(gramsFor("1 cup", 1, undefined)).toBeNull();
	});

	it("only lists weights backed by two sources that agree within 5%", () => {
		for (const [key, w] of Object.entries(WEIGHTS)) {
			expect(w.sources.length, key).toBeGreaterThanOrEqual(2);
			expect(w.spreadPct, key).toBeLessThanOrEqual(5);
		}
	});

	it("keeps weights off ambiguous or unverified ingredients", () => {
		const neverWeighed = /oats|dates|walnut|pecan|cashews\b|raisin|cranberr|cherr|carrot|shredded coconut|or honey|or maple|any nut butter|pretzel|dried fruit|seeds/i;
		for (const r of recipes)
			for (const ing of r.ingredients) if (neverWeighed.test(ing.item)) expect(ing.weigh, `${r.name}: ${ing.item}`).toBeUndefined();
	});

	it("weighs the ingredients we verified", () => {
		const weighed = recipes.flatMap((r) => r.ingredients.filter((i) => i.weigh).map((i) => `${i.item}→${i.weigh}`));
		expect(new Set(weighed)).toEqual(
			new Set([
				"peanut butter→peanutButter",
				"almond butter→almondCashewButter",
				"almond or cashew butter→almondCashewButter",
				"honey→honey",
				"maple syrup→mapleSyrup",
				"chocolate chips→chocolateChips",
				"mini chocolate chips→miniChocolateChips",
				"white chocolate chips→whiteChocolateChips",
				"cocoa powder→cocoaPowder",
				"almonds→wholeAlmonds",
				"unsweetened coconut flakes→coconutFlakes",
				"granulated sugar→sugar",
				"coconut oil→coconutOil",
				"sunflower seed butter→sunflowerButter",
			]),
		);
	});
});
