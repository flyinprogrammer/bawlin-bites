import { memo } from "react";
import type { Recipe } from "../../shared/recipes";

const N = 22; // pixel grid
const INK = "#1b1a17";
const BAYER = [
	[0, 8, 2, 10],
	[12, 4, 14, 6],
	[3, 11, 1, 9],
	[15, 7, 13, 5],
];

function rng(seed: string) {
	let h = 2166136261;
	for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
	return () => {
		h ^= h << 13;
		h ^= h >>> 17;
		h ^= h << 5;
		return ((h >>> 0) % 10000) / 10000;
	};
}

type Px = string | null;

function draw(recipe: Recipe): Px[][] {
	const { body, shade, bits, bitColor } = recipe.art;
	const grid: Px[][] = Array.from({ length: N }, () => Array<Px>(N).fill(null));
	const c = (N - 1) / 2;
	const r = N / 2 - 1.5;
	const inside = (x: number, y: number) => (x - c) ** 2 + (y - c) ** 2 <= r * r;

	for (let y = 0; y < N; y++) {
		for (let x = 0; x < N; x++) {
			if (!inside(x, y)) continue;
			const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
			if (edge) {
				grid[y][x] = INK;
				continue;
			}
			const nx = (x - c) / r;
			const ny = (y - c) / r;
			const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
			const light = Math.max(0, -0.5 * nx - 0.6 * ny + 0.62 * nz); // lit from top-left
			const threshold = (BAYER[y % 4][x % 4] + 0.5) / 16;
			grid[y][x] = light > 0.93 ? "#fffdf4" : light * 1.15 > threshold ? body : shade;
		}
	}

	const rand = rng(recipe.id);
	const count = bits === "none" ? 0 : bits === "crumbs" ? 18 : 12;
	for (let i = 0; i < count; i++) {
		const x = Math.floor(rand() * N);
		const y = Math.floor(rand() * N);
		const ok = (px: number, py: number) => grid[py]?.[px] && grid[py][px] !== INK;
		if (!ok(x, y)) continue;
		grid[y][x] = bitColor;
		if (bits === "chips" && ok(x + 1, y)) grid[y][x + 1] = bitColor;
		if (bits === "chips" && ok(x, y + 1) && rand() > 0.5) grid[y + 1][x] = bitColor;
		if (bits === "flakes" && ok(x + 1, y + 1)) grid[y + 1][x + 1] = bitColor;
	}
	return grid;
}

function BallArtImpl({ recipe, size = 96, className }: { recipe: Recipe; size?: number; className?: string }) {
	const grid = draw(recipe);
	const rects: React.ReactElement[] = [];
	// Merge horizontal runs of the same colour to keep the SVG small.
	grid.forEach((row, y) => {
		let x = 0;
		while (x < N) {
			const color = row[x];
			let w = 1;
			while (x + w < N && row[x + w] === color) w++;
			if (color) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={w} height={1} fill={color} />);
			x += w;
		}
	});
	return (
		<svg
			className={className}
			width={size}
			height={size}
			viewBox={`0 0 ${N} ${N}`}
			shapeRendering="crispEdges"
			role="img"
			aria-label={`Pixel art of a ${recipe.name} energy ball`}
		>
			<ellipse cx={N / 2} cy={N - 1} rx={N / 3} ry={0.9} fill={INK} opacity={0.18} />
			{rects}
		</svg>
	);
}

export const BallArt = memo(BallArtImpl);
