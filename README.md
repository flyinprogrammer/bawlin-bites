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
K.O.-ing every recipe cartridge it touches while debris rains down. The **🛑 STOP THE MADNESS!**
button bounces around the screen like an idle DVD logo; catch it to repair the site.

Both are original loops synthesized live with WebAudio in
[`src/react-app/music.ts`](src/react-app/music.ts), with no audio files.

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
Look & feel: a love letter to Panic's Playdate, plus one kaiju bunny. Hidden turbo mode: ↑ ↑ ↓ ↓ ← → ← → B A.
