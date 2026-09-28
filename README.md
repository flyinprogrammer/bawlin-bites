# Bawlin' Bites 🟡

An arcade-flavored recipe site for no-bake energy balls, live at **https://bawls.scherger.cloud**.

- **Vite + React** single-page app, served as static assets by a Cloudflare Worker
- **Hono** Worker handles `/api/*`
- **D1** stores thumbs up / thumbs down (one vote per browser per recipe)

## Develop

```sh
npm install        # Node 24 LTS (see .nvmrc)
npm run dev        # http://localhost:5173, uses a local D1 automatically
npm run lint
npm test           # recipe math: scaling, unit conversions, grams
npm run build
```

Recipes live in [`src/shared/recipes.ts`](src/shared/recipes.ts). Add an object to the array and
it shows up as a new cartridge (the pixel-art ball is generated from its `art` colors). Each
recipe's URL slug and vote key come from its name (`Salty Pretzel Combo` → `/r/salty-pretzel-combo`).
**Renaming a recipe?** Add `"old-slug": "new-slug"` to `RENAMED` so old links redirect and its
votes carry over. The Worker uses the same file to validate recipe ids.

## Sound

Sound is **off by default** and has its own 🔊/🔇 button, first in the hero button row. No audio
is created until someone turns it on, so the browser never blocks or warns about anything. (A
returning visitor who left sound on gets a screaming bunny asking for one click, since browsers
need that before audio can play.) Music: a mellow lo-fi "Chill Mix", and a 168 BPM "Turbo Mix".

The bunny starts asleep; poke it to wake it up. Keep poking and it gets steadily less amused, and
the 7th poke in a row sends it berserk into **turbo mode** (so does the Konami code, typed or
entered on the footer's cheat-code pad). In turbo it breaks loose and stomps down the page,
K.O.-ing every recipe cartridge it touches while debris rains down. Except one: a recipe with
`kaijuFave` set (currently Carrot Cake Cart) is spared, crowned in gold and moved to #1 (it keeps the
crown after the madness stops, until the page is refreshed), and the kaiju tells you why. The **🛑 STOP THE MADNESS!**
button bounces around the screen like an idle DVD logo; catch it to repair the site.

Both are original loops synthesized live with WebAudio in
[`src/react-app/music.ts`](src/react-app/music.ts), with no audio files.

## Batch sizes & grams

Every recipe can be made as a single, double or triple batch, and can show gram weights for a
kitchen scale. The math lives in [`src/shared/quantity.ts`](src/shared/quantity.ts) and is
tested in [`src/shared/quantity.test.ts`](src/shared/quantity.test.ts):

- Amounts are converted to an **exact** fraction of a teaspoon (1 tbsp = 3 tsp, 1 cup = 16 tbsp),
  multiplied with exact fractions (`fraction.js`, no floating point), then written back as the
  fewest scoops with real measuring cups (¼ ⅓ ½ ⅔ ¾) and spoons (tbsp, 1 ½ ¼ ⅛ tsp):
  3 × 1 tsp → **1 tbsp**, 2 × 3 tbsp → **¼ cup + 2 tbsp**, 3 × ⅓ cup → **1 cup**.
- The tests sweep every amount from ⅛ tsp to 12 cups and prove what's printed parses back to
  exactly the right amount, and check every recipe at 1×, 2× and 3×. They also fail if an
  amount hides somewhere scaling can't reach (like "zest + 2 tbsp juice" in a note).
- **Grams** ([`src/shared/weights.ts`](src/shared/weights.ts)) only exist where King Arthur Baking
  and USDA data agree within 5% for exactly that ingredient, and only for 1 tbsp or more.
  Oats, whole dates, nut halves, dried fruit, and "X or Y" swaps are deliberately left
  unweighed because the references disagree (up to 40%).

When adding a recipe: write quantities like `"1¼ cups"`, `"2 tbsp"`, `"½ tsp"`, `"1"` (with a
`plural`), `"pinch"` or `"optional"`; keep amounts out of `note`s; only add `weigh` for a
verified ingredient. `npm test` will tell you if anything can't be scaled exactly.

## Scherger tested & approved

Recipes the family has actually made get a green **SCHERGER TESTED** seal (stored in D1, table
`approvals`), a filter chip, and a note on the recipe and printout. To mark one:

1. Pick a long random admin token and add it as a secret named **`ADMIN_TOKEN`** under GitHub →
   Settings → Environments → **production**. The next deploy uploads it to the Worker.
2. On the site, click **🔑 Scherger HQ** in the footer, paste the token, open a recipe, and hit
   **✓ MARK TESTED & APPROVED**.

While logged in, every recipe also has a **Scherger notes** editor (Tiptap: bold, italic,
bullet/numbered lists, links). It's lazy-loaded, so only Scherger HQ downloads it. Saved notes are
HTML in D1 (`house_notes`) and replace the recipe's built-in `houseNotes`; saving an empty
editor shows no notes. Everyone else sees them through DOMPurify with a tiny allowlist
(`src/react-app/notesHtml.ts`, tested against scripts, event handlers, `javascript:` links…).

Locally, `cp .dev.vars.example .dev.vars` gives you `ADMIN_TOKEN=local-dev-token`.

## How votes work

| Route | Does |
| --- | --- |
| `GET /api/votes?voter=<uuid>` | `{ tallies: { [id]: { up, down } }, mine: { [id]: 1 \| -1 } }` |
| `PUT /api/votes/:recipeId` `{ voter, vote: 1 \| -1 \| 0 }` | cast / change / clear a vote |
| `GET /api/approvals` | `{ approvals: { [id]: { at, note } } }` |
| `PUT /api/approvals/:recipeId` `{ approved }` + `Authorization: Bearer <ADMIN_TOKEN>` | mark / unmark tested & approved |
| `GET /api/notes` | `{ notes: { [id]: html } }` (edited Scherger notes) |
| `PUT /api/notes/:recipeId` `{ html }` + bearer token | save a recipe's Scherger notes |

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
Look & feel: a love letter to Panic's Playdate, plus one kaiju bunny. Hidden turbo mode: ↑ ↑ ↓ ↓ ← → ← → B A.
