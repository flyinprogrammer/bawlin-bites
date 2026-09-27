import { Hono } from "hono";
import { RENAMED, recipeIds } from "../shared/recipes";

type Tally = { up: number; down: number };

const app = new Hono<{ Bindings: Env }>();

// The schema is tiny and idempotent, so each isolate creates it on first use
// instead of needing a separate migration step in CI.
let schemaReady: Promise<unknown> | undefined;
function ensureSchema(db: D1Database) {
	schemaReady ??= db
		.batch([
			db.prepare(
				`CREATE TABLE IF NOT EXISTS votes (
					recipe_id TEXT NOT NULL,
					voter_id TEXT NOT NULL,
					vote INTEGER NOT NULL CHECK (vote IN (-1, 1)),
					updated_at INTEGER NOT NULL,
					PRIMARY KEY (recipe_id, voter_id)
				)`,
			),
			// "Scherger tested & approved": one row per recipe the family has actually made.
			db.prepare(
				`CREATE TABLE IF NOT EXISTS approvals (
					recipe_id TEXT PRIMARY KEY,
					approved_at INTEGER NOT NULL,
					note TEXT
				)`,
			),
		])
		.then(() =>
			// Carry votes over from renamed recipes. Idempotent: once moved, nothing matches.
			db.batch(
				Object.entries(RENAMED).flatMap(([from, to]) => [
					db.prepare("UPDATE OR IGNORE votes SET recipe_id = ? WHERE recipe_id = ?").bind(to, from),
					db.prepare("DELETE FROM votes WHERE recipe_id = ?").bind(from),
					db.prepare("UPDATE OR IGNORE approvals SET recipe_id = ? WHERE recipe_id = ?").bind(to, from),
					db.prepare("DELETE FROM approvals WHERE recipe_id = ?").bind(from),
				]),
			),
		)
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

// ─── Scherger tested & approved ────────────────────────────────────────────
// Anyone can read approvals; changing them needs the ADMIN_TOKEN secret as a
// bearer token (set in GitHub → Environments → production, synced on deploy).

const NOTE_MAX = 200;

async function isAdmin(c: { env: Env; req: { header: (name: string) => string | undefined } }) {
	const expected = c.env.ADMIN_TOKEN;
	const given = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
	if (!expected || !given) return false;
	// Compare fixed-length digests in constant time so the token can't be guessed byte by byte.
	const [a, b] = await Promise.all(
		[expected, given].map((v) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))),
	);
	return crypto.subtle.timingSafeEqual(a, b);
}

app.get("/api/approvals", async (c) => {
	await ensureSchema(c.env.DB);
	const { results } = await c.env.DB.prepare("SELECT recipe_id, approved_at, note FROM approvals").all<{
		recipe_id: string;
		approved_at: number;
		note: string | null;
	}>();
	const approvals: Record<string, { at: number; note: string | null }> = {};
	for (const row of results) if (recipeIds.has(row.recipe_id)) approvals[row.recipe_id] = { at: row.approved_at, note: row.note };
	return c.json({ approvals });
});

app.get("/api/admin", async (c) => {
	if (!c.env.ADMIN_TOKEN) return c.json({ error: "admin not configured" }, 503);
	return (await isAdmin(c)) ? c.body(null, 204) : c.json({ error: "bad token" }, 401);
});

app.put("/api/approvals/:recipeId", async (c) => {
	if (!c.env.ADMIN_TOKEN) return c.json({ error: "admin not configured" }, 503);
	if (!(await isAdmin(c))) return c.json({ error: "bad token" }, 401);
	const recipeId = c.req.param("recipeId");
	if (!recipeIds.has(recipeId)) return c.json({ error: "unknown recipe" }, 404);

	const body = await c.req.json<{ approved?: unknown; note?: unknown }>().catch(() => ({}) as Record<string, unknown>);
	if (typeof body.approved !== "boolean") return c.json({ error: "approved must be true or false" }, 400);
	if (body.note !== undefined && body.note !== null && typeof body.note !== "string") return c.json({ error: "bad note" }, 400);
	const note = typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, NOTE_MAX) : null;

	await ensureSchema(c.env.DB);
	if (!body.approved) {
		await c.env.DB.prepare("DELETE FROM approvals WHERE recipe_id = ?").bind(recipeId).run();
		return c.json({ approval: null });
	}
	const at = Date.now();
	await c.env.DB.prepare(
		`INSERT INTO approvals (recipe_id, approved_at, note) VALUES (?, ?, ?)
		 ON CONFLICT (recipe_id) DO UPDATE SET note = excluded.note`,
	)
		.bind(recipeId, at, note)
		.run();
	const row = await c.env.DB.prepare("SELECT approved_at, note FROM approvals WHERE recipe_id = ?")
		.bind(recipeId)
		.first<{ approved_at: number; note: string | null }>();
	return c.json({ approval: row ? { at: row.approved_at, note: row.note } : null });
});

app.all("/api/*", (c) => c.json({ error: "not found" }, 404));

export default app;
