# Second Helping

**Second Helping: more of the food they love, checked against their medicines.**

Meal and restaurant ideas for older adults: restaurants that people with similar tastes tend to enjoy (from Qloo), checked by a transparent, reviewed food-medicine and texture safety layer.

> **Not medical advice. The people in this demo are fictional.** Second Helping is a hackathon demo. It does not replace a pharmacist, doctor or speech and language therapist. Restaurants come from Qloo and are real businesses; Second Helping is not affiliated with them. Dishes are typical for the cuisine, not their menu, so always check with the restaurant. Ask your pharmacist or doctor about real medicines.

Built for the Qloo Agent Hackathon. **Live demo: https://secondhelping.vercel.app** (Vercel free Hobby plan, no login needed).

## The problem

Families who feed an older parent who takes several medicines face two problems at once. The meals have to be food the parent will actually enjoy, and they have to avoid known food-medicine clashes (for example grapefruit with some statins, or a sudden change in leafy greens with warfarin) and foods that are hard to chew or swallow. General chatbots will happily suggest the clashing food, and a plain interaction list does not help someone decide where to eat or what to cook.

Second Helping puts the two together: Qloo supplies the taste evidence for where people with similar tastes tend to enjoy eating, and a pharmacy-reviewed rule set checks every suggestion, showing the reason for every caution and exclusion.

**Status:** Qloo is connected: restaurants are real places near the chosen city (New York by default). If Qloo cannot be reached, the app says so and shows clearly labelled made-up places (the yellow **"SIMULATED TASTE DATA, NOT QLOO"** banner shows whenever no Qloo key is set).

## What it does

Build a fictional profile (favourite cuisines and dishes, medicine groups, eating needs, city), then get:

- **Restaurants:** places that people with similar tastes tend to enjoy, found by an AI agent that decides which cuisines to explore.
- **Cook at home:** dish ideas by cuisine, the cuisines people with similar tastes tend to enjoy most first.
- **Weekly plan:** a lunch and a dinner for each day, with no repeats and nothing the rules exclude.
- **Ask Second Helping:** ask in plain English ("Margaret wants fish tonight, which restaurant?"). A Gemini agent chooses tools (taste, menu search, the safety rules, the weekly plan) and every step is shown under the answer. It can only choose and explain: it cannot override, soften or invent a safety result, it refuses anything outside meals and food safety, and it never gives dosing advice.

Every dish is checked against written rules and gets one of four results, always with the reason:

| Result | Meaning |
| --- | --- |
| No concerns found | No rule applied for this profile |
| Caution | A rule applies. The dish is shown with the reason |
| Swap suggested | A rule applies. A better alternative is suggested |
| Excluded | A rule excludes the dish. It is listed under "Why some dishes were left out" |

Press **Why? ↻** on a dish card to flip it and see the rule behind its badge. "Compare with a generic AI" shows the same ideas with and without the safety layer. The comparison's left side is an invented, clearly labelled illustration, not real chatbot output.

## How the safety layer works

- **Rules, not AI.** The checks are fixed rules in code (`src/safety/engine.ts`). The AI never decides what is excluded or cautioned. The restaurant agent never sees the person's medicines.
- **Reviewed rules only.** Rules are in `rules/safety-rules.json` and the medicine groups they use are in `rules/medicine-groups.json`. They were reviewed by a pharmacy assistant with 20 years of community pharmacy experience. The engine uses a rule only if it is marked `reviewed: true` **and** every medicine group it uses is also reviewed. Anything else is reported as inactive, never silently dropped.
- **Transparent.** The app has a Safety section: rules by medicine, by food, and who reviewed them. Each rule names its source. The sources were named from general knowledge and **still need checking**.
- **Covers:** grapefruit with certain statins and calcium-channel blockers, vitamin K and warfarin, alcohol with sedatives, metformin and warfarin, salt, potassium and liquorice, tyramine foods with MAO inhibitors, dairy and levothyroxine timing with some antibiotics, sugar with diabetes, and easy-to-chew and swallowing textures.

## How Qloo is used

**Workflow.** The Qloo Insights API answers one question: *which restaurants near this city centre do people with tastes like these tend to enjoy?* The answer's affinity score ranks restaurants, a short list covers each favourite cuisine, and then our own safety layer checks the typical dishes of that cuisine. Qloo never decides what is safe.

**Why it fits.** Choosing where an older person will eat is a taste problem and a safety problem. Qloo answers the taste half with evidence from many people instead of a guess, and it returns real restaurants with an affinity score, distance, rating and website, so the safety layer has a concrete place and cuisine to work on.

**What is called.** `GET {QLOO_BASE_URL}/v2/insights` on the hackathon server (key in the `X-Api-Key` header, parameters in the query string), with the restaurant tag `urn:tag:genre:place:restaurant`, the person's favourite cuisines as `signal.interests.tags` (for example `urn:tag:genre:place:restaurant:italian`), and a `POINT(lon lat)` city-centre filter within 5 km. No MCP tools or agent modes are used. **A redacted request-to-result walk-through, with the entity and tag choices and why, is in [docs/QLOO-REQUEST-TO-RESULT.md](docs/QLOO-REQUEST-TO-RESULT.md).**

**Qloo's part vs ours.** The restaurant list and the affinity score are Qloo's, labelled "Qloo" in the interface. The typical dishes, the safety verdicts, the wording and the weekly plan are our own interpretation.

- **Cities:** New York (default), London, Chicago, Los Angeles, Toronto and Bucharest.
- **Fallback:** `src/taste/index.ts` tries Qloo first and falls back to the labelled simulated provider (`src/taste/mock-taste-provider.ts`) when Qloo errors, times out or is rate limited. Every place carries its own source (`QLOO` or `SIMULATED`), so the UI always says which it is.
- **Cache and data rules:** Qloo responses are cached only in server memory for an hour. No Qloo data is stored in this repository: tests use invented fixtures. `npm run qloo:check` makes a few live calls and prints counts only.
- **Dishes:** Qloo returns restaurants, not menus, so dishes are typical for the cuisine and the app tells people to check with the restaurant.

## Responsible data handling

These follow Qloo's safe-use guidance for the hackathon.

- **Nothing personal goes to Qloo.** Only cuisine tags, a fixed city-centre point, a radius and a result count are sent. Never a name, email, device ID, account ID, location history, medicine, condition, eating need, favourite dish, or anything typed in the chat. `tests/privacy.test.ts` checks every request the app makes, including when the carer types a name and health details into the chat.
- **The key stays on the server.** `QLOO_API_KEY` is read in one server-only file, is sent only in a header, is never in a URL, a prompt or a log, and is not in any file the browser downloads (checked by a test and by searching the production build). It is never committed.
- **Results are presented as group-level evidence.** The interface says each Qloo score describes what groups of people with similar tastes tend to enjoy, not what one person will do, and shows the source on every card. Model wording that predicts one person's taste ("they will love it") is rejected by a check and replaced by plain text.
- **No health inference from Qloo.** Qloo is not used to infer health, identity or any sensitive trait. The medicine and condition checks run locally against our own reviewed rules.
- **What else leaves the server (not to Qloo).** The optional Gemini step receives the fictional first name, favourite cuisines and dishes, and the place names and scores. The restaurant agent never receives medicines. In the chat, Gemini also receives the question the carer types and dish statuses with rule numbers, so a question could contain a medicine name if someone types one: please do not enter real health details. Profiles stay in the visitor's own browser; nothing is stored on a server.
- **Fictional people only.** Please do not enter real names or real health details.

## Known limitations

- **What the Qloo result does not establish:** it is a group-level tendency. It does not predict what one person will like, is not a probability about an individual or a causal claim, and says nothing about health, price, quality or the restaurant's menu.
- **Dishes are typical, not real menus.** The safety check covers a small fictional catalogue of typical dishes for six cuisines (Italian, Indian, Chinese, British, Greek, Japanese). Places of other cuisines are skipped.
- **The rules are a demonstration, not clinical advice.** 22 rules and 13 medicine groups were reviewed by one pharmacy assistant; the sources were named from general knowledge and still need checking; a medicine that is not in a listed group has no rules and is **not** known to be free of food interactions. It has not been clinically validated or tested with older adults.
- **Location is a city-centre preset** (six cities, 5 km), not the person's location. Data can be out of date; closed places that Qloo marks as closed are skipped.
- **Free-tier limits.** Qloo hackathon keys have per-minute and monthly quotas, and the free Gemini tier can be slow or unavailable. The app then falls back to clearly labelled simulated places or plain template wording, with the same safety verdicts.
- **English only**, and the cache is per server instance and lasts an hour.

## Tech

- Next.js 15 (App Router) and TypeScript
- [Vercel AI SDK](https://ai-sdk.dev) with Google Gemini (free tier) for the agent loop and friendly wording
- Zod for input validation, Vitest for tests
- No database. A profile stays in the visitor's own browser (`localStorage`).

## Setup from a clean environment

Requirements: Node.js 20 or newer (developed on Node 24) and npm. No keys are needed to run it.

```bash
git clone https://github.com/iancuileana83-lab/second-helping.git
cd second-helping
npm ci
npm test                 # all tests, no keys needed
npm run build
npm run dev              # then open http://localhost:3000
```

**With no keys** the whole app works: restaurants come from the clearly labelled simulated provider (yellow "SIMULATED TASTE DATA, NOT QLOO" banner) and wording uses plain templates. The safety rules behave identically.

**With your own keys**, copy the example file and fill in the values yourself (`.env` is git-ignored; never commit it):

```bash
cp .env.example .env     # on Windows PowerShell: Copy-Item .env.example .env
```

| Variable | Needed? | Purpose |
| --- | --- | --- |
| `QLOO_API_KEY` | Optional | A Qloo hackathon key. Without it the app uses the labelled simulated provider. |
| `QLOO_BASE_URL` | Optional | Defaults to `https://hackathon.api.qloo.com` (hackathon keys do not work on `api.qloo.com`). |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | A Google AI Studio key for the agent and wording. Without it the app uses plain template wording. |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-3.5-flash-lite`. |

**Check that it works.** With `QLOO_API_KEY` set, `npm run qloo:check` prints counts only (a tag lookup and restaurants near three cities, each with `HTTP 200`) and ends with `RESULT: Qloo works`. In the app, choose a profile on *Person > Tastes* (or load an example), open *Meal ideas > Restaurants*, press **Find restaurants**, and each place card should say "Qloo affinity score" (real restaurants) or "Simulated score" (made-up places, no key).

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` then `npm start` | Production build and server |
| `npm test` | Run all tests |
| `npm run typecheck` | TypeScript check |
| `npm run qloo:check` | A few live Qloo calls, counts only (needs `QLOO_API_KEY` in `.env`) |

## Tests

The tests cover the review gate, the rule file, each rule's behaviour, whole-word matching, profile validation, the weekly plan (an excluded dish can never appear), the Qloo provider and its fallback, what is sent to Qloo (no personal data), that the key never reaches the browser, the wording checks, the chat agent (including an attempt to talk it into allowing grapefruit with simvastatin), and the card helpers.

## Project layout

```
rules/                     Reviewed rules and medicine groups (JSON)
docs/                      Redacted Qloo request-to-result explanation
src/safety/                Deterministic safety engine and types
src/taste/                 TasteProvider interface, the Qloo provider and the simulated stand-in
src/agent/                 Gemini agents: restaurants and "Ask Second Helping"
src/lib/                   Profile schema, meal ideas, weekly plan, comparison, helpers
src/data/                  Fictional menus and example people
src/components/            Navigation, dish cards, taste map, tour, and other UI
src/app/                   Pages and API routes (/api/plan, /api/meals, /api/ask)
scripts/                   qloo-check.mjs (live check, counts only)
tests/                     Vitest tests
```

## Changing the rules

Rules should only be changed by the reviewer. A new or edited rule must be marked `reviewed: true` with `reviewed_by` and `reviewed_on`, and every new rule needs a one-line preview in `src/lib/rule-preview.ts` (a test enforces this). Run `npm test` afterwards.

## Licence

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Ileana Mazilu.
