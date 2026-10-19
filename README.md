# SafePlate

Meal and restaurant ideas for older adults, matched to their taste and checked by a transparent, reviewed food-medicine and texture safety layer.

> **Not medical advice. Fictional people and data only.** SafePlate is a hackathon demo. It does not replace a pharmacist, doctor or speech and language therapist. Dishes are typical for a cuisine, not the exact menu of any place, so always check the menu. Ask your pharmacist or doctor about real medicines.

Built for the Qloo Agent Hackathon.

**Status:** Qloo is **not connected yet**. The app currently ranks places with a clearly labelled stand-in, and the yellow banner **"SIMULATED TASTE DATA, NOT QLOO"** shows on every page. The real Qloo client will plug in behind the same interface (see [Qloo](#qloo)). **Live demo: https://safeplate-nu.vercel.app** (hosted on the Vercel free Hobby plan; no login needed).

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

Qloo is meant to provide the taste ranking: which cuisines and places fit this person's real taste. SafePlate then filters everything through the safety layer. Qloo never decides what is safe.

- **Now:** `MockTasteProvider` (`src/taste/mock-taste-provider.ts`) returns made-up places with a simple overlap score. Everything it produces is labelled simulated.
- **Next:** a `QlooTasteProvider` implementing the same `TasteProvider` interface (`src/taste/provider.ts`), using the Qloo Insights API (`GET /v2/insights`, `X-Api-Key` header, `filter.type=urn:entity:place`, cuisine tags and taste signals). It is not written yet. When `QLOO_API_KEY` is available it will replace the stand-in, and the banner will go away.

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
| `QLOO_API_KEY` | Not used yet | Reserved for the real Qloo provider. |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Run all tests |
| `npm run typecheck` | TypeScript check |

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

- All people, places and dishes are fictional. Please do not enter real names or real health details.
- The server accepts only fixed choices (cuisines, dishes, reviewed medicine groups, conditions, needs). The only free text is a letters-only name.
- The API has a best-effort per-IP rate limit to protect the free AI quota.
- Nothing is stored on a server.

## Changing the rules

Rules should only be changed by the reviewer. A new or edited rule must be marked `reviewed: true` with `reviewed_by` and `reviewed_on`, and every new rule needs a one-line preview in `src/lib/rule-preview.ts` (a test enforces this). Run `npm test` afterwards.

## Licence

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Ileana Mazilu.
