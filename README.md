# SafePlate

Meal and restaurant ideas for older adults, matched to their taste and checked by a transparent, reviewed food-medicine and texture safety layer.

> **Not medical advice. The people in this demo are fictional.** SafePlate is a hackathon demo. It does not replace a pharmacist, doctor or speech and language therapist. Restaurants come from Qloo and are real businesses; SafePlate is not affiliated with them. Dishes are typical for the cuisine, not their menu, so always check with the restaurant. Ask your pharmacist or doctor about real medicines.

Built for the Qloo Agent Hackathon.

**Status:** Qloo is connected: restaurants are real places near the chosen city (New York by default), ranked by Qloo's affinity to the person's favourite cuisines. If Qloo cannot be reached, the app says so and shows clearly labelled made-up places (the yellow **"SIMULATED TASTE DATA, NOT QLOO"** banner shows whenever no Qloo key is set). **Live demo: https://safeplate-nu.vercel.app** (hosted on the Vercel free Hobby plan; no login needed).

## What it does

Build a fictional profile (favourite cuisines and dishes, medicine groups, eating needs), then get:

- **Restaurants:** places ranked by taste, found by an AI agent that decides which cuisines to explore.
- **Cook at home:** dish ideas by cuisine, best taste match first.
- **Weekly plan:** a lunch and a dinner for each day, with no repeats and nothing the rules exclude.

- **Ask SafePlate:** ask in plain English ("Margaret wants fish tonight, which restaurant?"). A Gemini agent chooses tools (taste, menu search, the safety rules, the weekly plan) and every step is shown under the answer. It can only choose and explain: it cannot override, soften or invent a safety result, it refuses anything outside meals and food safety, and it never gives dosing advice.

Every dish is checked against written rules and gets one of four results, always with the reason:

| Result | Meaning |
| --- | --- |
| No concerns found | No rule applied for this profile |
| Caution | A rule applies. The dish is shown with the reason |
| Swap suggested | A rule applies. A better alternative is suggested |
| Excluded | A rule excludes the dish. It is listed under "Why some dishes were left out" |

Press **Why? ↻** on a dish card to flip it and see the rule behind its badge. "Compare with a generic AI" shows the same ideas with and without the safety layer. The comparison's left side is an invented, clearly labelled illustration, not real chatbot output.

## How the safety layer works

- **Rules, not AI.** The checks are fixed rules in code (`src/safety/engine.ts`). The AI never decides what is excluded or cautioned. The model does not even see the person's medicines.
- **Reviewed rules only.** Rules are in `rules/safety-rules.json` and the medicine groups they use are in `rules/medicine-groups.json`. They were reviewed by a pharmacy assistant with 20 years of community pharmacy experience. The engine uses a rule only if it is marked `reviewed: true` **and** every medicine group it uses is also reviewed. Anything else is reported as inactive, never silently dropped.
- **Transparent.** The app has a Safety section: rules by medicine, by food, and who reviewed them. Each rule names its source. The sources were named from general knowledge and **still need checking**.
- **Covers:** grapefruit with certain statins and calcium-channel blockers, vitamin K and warfarin, alcohol with sedatives, metformin and warfarin, salt, potassium and liquorice, tyramine foods with MAO inhibitors, dairy and levothyroxine timing with some antibiotics, sugar with diabetes, and easy-to-chew and swallowing textures.
- **Limits.** Matching is by cuisine and typical dish type, not real menu ingredients. Only the medicine groups listed in the app have rules. A medicine that is not listed is **not** known to be free of food interactions.

## Qloo

Qloo provides the taste ranking: which restaurants fit this person's real taste. SafePlate then checks every typical dish through the safety layer. Qloo never decides what is safe.

- **What is called:** the Qloo Insights API on the hackathon server (`GET {QLOO_BASE_URL}/v2/insights`, key in the `X-Api-Key` header, parameters in the query string). Restaurants are filtered with the tag `urn:tag:genre:place:restaurant` near a `POINT(lon lat)` within 5 km, and the person's favourite cuisines (tags such as `urn:tag:genre:place:restaurant:italian`) are the `signal.interests.tags`. The response's `query.affinity` is the taste score.
- **Cities:** New York (default), London, Chicago, Los Angeles, Toronto and Bucharest.
- **Fallback:** `src/taste/index.ts` tries Qloo first and falls back to the labelled simulated provider (`src/taste/mock-taste-provider.ts`) when Qloo errors, times out or is rate limited. Every place carries its own source, so the UI always says whether it is Qloo or simulated.
- **Cache and data rules:** Qloo responses are cached only in server memory for an hour. No Qloo data is stored in this repository: tests use invented fixtures. `npm run qloo:check` makes a few live calls and prints counts only.
- **Dishes:** Qloo returns restaurants, not menus, so dishes are typical for the cuisine and the app tells people to check with the restaurant.

## Tech

- Next.js 15 (App Router) and TypeScript
- [Vercel AI SDK](https://ai-sdk.dev) with Google Gemini (free tier) for the agent loop and friendly wording
- Zod for input validation, Vitest for tests
- No database. A profile stays in the visitor's own browser (`localStorage`).

## Run it locally

Requirements: Node.js 20 or newer (developed on Node 24) and npm.

```bash
npm install
cp .env.example .env     # on Windows PowerShell: Copy-Item .env.example .env
npm run dev
```

Open http://localhost:3000.

### Environment variables

Put these in `.env` yourself. `.env` is git-ignored. Never commit it or paste keys into issues.

| Variable | Needed? | Purpose |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | A Google AI Studio key. Without it the app still works and uses plain template wording instead of AI wording. |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-3.5-flash-lite`. |
| `QLOO_API_KEY` | Optional | A Qloo hackathon key. Without it the app uses the labelled simulated provider. |
| `QLOO_BASE_URL` | Optional | Defaults to `https://hackathon.api.qloo.com` (hackathon keys do not work on `api.qloo.com`). |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Run all tests |
| `npm run typecheck` | TypeScript check |
| `npm run qloo:check` | A few live Qloo calls, counts only (needs `QLOO_API_KEY` in `.env`) |

## Tests

```bash
npm test
```

The tests cover the review gate, the rule file, each rule's behaviour, whole-word matching, the profile validation, the weekly plan (an excluded dish can never appear), the mock provider, the agent without an AI key, and the comparison and card helpers.

## Project layout

```
rules/                     Reviewed rules and medicine groups (JSON)
src/safety/                Deterministic safety engine and types
src/taste/                 TasteProvider interface and the simulated stand-in
src/agent/                 Gemini agent loop (tools: find places, check menu)
src/lib/                   Profile schema, meal ideas, weekly plan, comparison, helpers
src/data/                  Fictional menus and example people
src/components/            Navigation, dish cards, taste map, tour, and other UI
src/app/                   Pages and API routes (/api/plan, /api/meals)
tests/                     Vitest tests
```

## Safety and privacy notes

- All people are fictional. Restaurants (from Qloo) are real businesses; dishes are typical, not their menu. Please do not enter real names or real health details.
- The server accepts only fixed choices (cuisines, dishes, reviewed medicine groups, conditions, needs). The only free text is a letters-only name.
- The API has a best-effort per-IP rate limit to protect the free AI quota.
- Nothing is stored on a server.

## Changing the rules

Rules should only be changed by the reviewer. A new or edited rule must be marked `reviewed: true` with `reviewed_by` and `reviewed_on`, and every new rule needs a one-line preview in `src/lib/rule-preview.ts` (a test enforces this). Run `npm test` afterwards.

## Licence

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Ileana Mazilu.
