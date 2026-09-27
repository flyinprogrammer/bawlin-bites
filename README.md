# Bawlin' Bites 🟡

An arcade-flavored recipe site for no-bake energy balls, live at **https://bawls.scherger.cloud**.

- **Vite + React** single-page app, served as static assets by a Cloudflare Worker
- **Hono** Worker handles `/api/*`
- **D1** stores thumbs up / thumbs down (one vote per browser per recipe)

## Develop

```sh
npm install
npm run dev        # http://localhost:5173, uses a local D1 automatically
npm run lint
npm run build
```

Recipes live in [`src/shared/recipes.ts`](src/shared/recipes.ts). Add an object to the array and
it shows up as a new cartridge (the pixel-art ball is generated from its `art` colors). The Worker
uses the same file to validate recipe ids, so votes for removed recipes are ignored.

## How votes work

| Route | Does |
| --- | --- |
| `GET /api/votes?voter=<uuid>` | `{ tallies: { [id]: { up, down } }, mine: { [id]: 1 \| -1 } }` |
| `PUT /api/votes/:recipeId` `{ voter, vote: 1 \| -1 \| 0 }` | cast / change / clear a vote |

The browser generates a random voter UUID and keeps it in `localStorage`. The Worker creates the
`votes` table itself (`CREATE TABLE IF NOT EXISTS`), so there are no migrations to run.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) lints and builds every PR, and deploys `main` with
`wrangler deploy`. The first deploy auto-creates the `bawlin-bites` D1 database and attaches the
`bawls.scherger.cloud` custom domain (DNS record and certificate included).

One-time setup: add a repo secret **`CLOUDFLARE_API_TOKEN`**. Create it in the Cloudflare dashboard →
My Profile → API Tokens → *Create Token* → **Edit Cloudflare Workers** template, then:

- **Account resources:** the account that owns `scherger.cloud`
- **Zone resources:** `scherger.cloud`
- **Add permission:** Account → **D1** → **Edit**

To deploy by hand instead: `npx wrangler login && npm run deploy`.

## Credits

Several recipes are adapted from [Well Plated by Erin Clarke](https://www.wellplated.com/energy-balls/),
[Kids Eat in Color](https://kidseatincolor.com/no-bake-chocolate-orange-date-balls/) and
[Yummy Toddler Food](https://www.yummytoddlerfood.com/no-bake-energy-balls-with-fruit/); each card credits and links its source.
Recipes with a `promo` show a "Bonus Pack" plug, and ones that need a food processor show a gear plug
(`FOOD_PROCESSOR` in `recipes.ts`).
Look & feel: a love letter to Panic's Playdate. Hidden turbo mode: ↑ ↑ ↓ ↓ ← → ← → B A.
