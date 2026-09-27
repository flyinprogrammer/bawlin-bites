import { Hono } from "hono";
import { recipeIds } from "../shared/recipes";

type Tally = { up: number; down: number };

const app = new Hono<{ Bindings: Env }>();

// The schema is tiny and idempotent, so each isolate creates it on first use
// instead of needing a separate migration step in CI.
let schemaReady: Promise<unknown> | undefined;
function ensureSchema(db: D1Database) {
	schemaReady ??= db
		.prepare(
			`CREATE TABLE IF NOT EXISTS votes (
				recipe_id TEXT NOT NULL,
				voter_id TEXT NOT NULL,
				vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
				updated_at INTEGER NOT NULL,
				PRIMARY KEY (recipe_id, voter_id)
			)`,
		)
		.run()
		.catch((err) => {
			schemaReady = undefined;
			throw err;
		});
	return schemaReady;
}

const VOTER_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function tallies(db: D1Database, recipeId?: string) {
	const sql = `SELECT recipe_id,
			SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS up,
			SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS down
		FROM votes ${recipeId ? "WHERE recipe_id = ?" : ""} GROUP BY recipe_id`;
	const stmt = recipeId ? db.prepare(sql).bind(recipeId) : db.prepare(sql);
	const { results } = await stmt.all<{ recipe_id: string; up: number; down: number }>();
	const out: Record<string, Tally> = {};
	for (const row of results) {
		if (recipeIds.has(row.recipe_id)) out[row.recipe_id] = { up: row.up, down: row.down };
	}
	return out;
}

app.get("/api/votes", async (c) => {
	await ensureSchema(c.env.DB);
	const voter = c.req.query("voter");
	const mine: Record<string, 1 | -1> = {};
	if (voter && VOTER_RE.test(voter)) {
		const { results } = await c.env.DB.prepare("SELECT recipe_id, vote FROM votes WHERE voter_id = ?")
			.bind(voter.toLowerCase())
			.all<{ recipe_id: string; vote: 1 | -1 }>();
		for (const row of results) mine[row.recipe_id] = row.vote;
	}
	return c.json({ tallies: await tallies(c.env.DB), mine });
});

app.put("/api/votes/:recipeId", async (c) => {
	const recipeId = c.req.param("recipeId");
	if (!recipeIds.has(recipeId)) return c.json({ error: "unknown recipe" }, 404);

	const body = await c.req.json<{ voter?: unknown; vote?: unknown }>().catch(() => ({}) as Record<string, unknown>);
	const { voter, vote } = body;
	if (typeof voter !== "string" || !VOTER_RE.test(voter)) return c.json({ error: "bad voter" }, 400);
	if (vote !== 1 && vote !== -1 && vote !== 0) return c.json({ error: "vote must be 1, -1 or 0" }, 400);

	await ensureSchema(c.env.DB);
	const voterId = voter.toLowerCase();
	if (vote === 0) {
		await c.env.DB.prepare("DELETE FROM votes WHERE recipe_id = ? AND voter_id = ?").bind(recipeId, voterId).run();
	} else {
		await c.env.DB.prepare(
			`INSERT INTO votes (recipe_id, voter_id, vote, updated_at) VALUES (?, ?, ?, ?)
			 ON CONFLICT (recipe_id, voter_id) DO UPDATE SET vote = excluded.vote, updated_at = excluded.updated_at`,
		)
			.bind(recipeId, voterId, vote, Date.now())
			.run();
	}
	const tally = (await tallies(c.env.DB, recipeId))[recipeId] ?? { up: 0, down: 0 };
	return c.json({ tally, mine: vote === 0 ? null : vote });
});

app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

export default app;
