# Qloo: from request to result (redacted)

This page explains one Qloo workflow end to end: what Second Helping asks, why those entities and tags, what comes back,
and how the result is used. It follows the kit's `SUBMISSION.md` ("a redacted request-to-result explanation, including any
entity/tag choices").

**Redaction.** The API key is shown as `<REDACTED>`. The result below is the *shape* of a Qloo response with placeholders.
It contains no real Qloo data, because the hackathon rules do not allow storing Qloo response data in a public repository.
Run `npm run qloo:check` (with your own key in `.env`) to see live counts.

## 1. The question we ask Qloo

> Which restaurants near this city centre do people with tastes like these tend to enjoy?

Qloo gets only that: a few cuisine tags and a city-centre point. It never gets a name, an email, a device ID, medicines,
conditions, eating needs, the dishes someone likes, or anything typed in the chat. A test (`tests/privacy.test.ts`) checks this
on every request the app makes.

## 2. Entity and tag choices, and why

| Choice | Value | Why |
| --- | --- | --- |
| Entity type | `filter.type=urn:entity:place` | Restaurants are places. The guide says `urn:entity:food_and_drink` is not supported. |
| Restaurants only | `filter.tags=urn:tag:genre:place:restaurant` | A place query with only a location returned parks and museums, so the restaurant tag keeps results to restaurants. |
| Cuisine tags | `urn:tag:genre:place:restaurant:italian`, `…:indian`, `…:chinese`, `…:british`, `…:greek`, `…:japanese` | The guide says free-text cuisines are rejected, so the tag IDs were found once with `GET /v2/tags?filter.query=<cuisine>&filter.parents.types=urn:entity:place`. These six are the cuisines the app has typical dishes for. |
| Taste signal | `signal.interests.tags` = the person's favourite cuisines (tags only) | Gives Qloo an aggregate taste signal without any entity that identifies a person. |
| Place | `filter.location=POINT(<lon> <lat>)` and `filter.location.radius=5000` | A fixed city-centre preset (New York, London, Chicago, Los Angeles, Toronto, Bucharest), never a person's location. A place-name location filter returned no results in testing, so a point is used. |
| Size | `take=12` (or 5 for one cuisine) | Extra results are requested because places of cuisines the app has no dishes for are dropped. |

Tool used: the Qloo Insights REST API (`GET /v2/insights`), plus `GET /v2/tags` once at design time. No MCP tools or agent
modes were used.

## 3. The request (redacted)

```
GET https://hackathon.api.qloo.com/v2/insights
    ?filter.type=urn:entity:place
    &filter.tags=urn:tag:genre:place:restaurant
    &signal.interests.tags=urn:tag:genre:place:restaurant:italian,urn:tag:genre:place:restaurant:greek
    &filter.location=POINT(-74.006 40.7128)
    &filter.location.radius=5000
    &take=12

Header:  X-Api-Key: <REDACTED>
```

The key is sent only from the server, in the header, never in the URL, and it is never included in a prompt or a log.

## 4. The result (shape only, placeholders)

```json
{
  "success": true,
  "results": {
    "entities": [
      {
        "name": "<restaurant name>",
        "entity_id": "<id>",
        "query": { "affinity": "<number between 0 and 1>", "distance": "<metres>" },
        "properties": { "address": "<address>", "business_rating": "<number>", "website": "<url>", "is_closed": "<true|false>" },
        "tags": [ { "id": "urn:tag:genre:place:restaurant:<cuisine>", "name": "<cuisine>" } ]
      }
    ]
  }
}
```

## 5. How the result is used in the product

1. **Parse defensively.** Closed places, nameless entities, places without a supported cuisine tag, and non-http websites are dropped.
2. **Keep the best place of each favourite cuisine in turn**, so a short list covers every favourite cuisine, not just the top scorer.
3. **Show the evidence.** Each card shows `Qloo affinity score 0.xx (0 to 1)`, the distance, rating, address and the restaurant's own website,
   with the note that scores describe what groups with similar tastes tend to enjoy, and that Second Helping is not affiliated with the restaurant.
4. **Hand over to our own layer.** Qloo says nothing about safety. The cuisine's typical dishes go through the 22 reviewed food-medicine
   and texture rules, and each dish is shown as no concerns, caution, swap or excluded, with the rule.

**Qloo's part vs ours.** The restaurant list and the affinity score are Qloo's. The dish list, the safety verdicts, the wording and the
weekly plan are our own interpretation and are labelled that way.

## 6. What the result does not establish

- It describes what **groups of people with similar tastes tend to enjoy**. It does not predict what one person will like or do, and it is
  not a probability about an individual or a causal claim.
- It says nothing about health, safety, price, quality or what is on a restaurant's menu.
- It does not mean the restaurant suits a medicine or a texture need. That is what the safety layer is for, and it can only check typical dishes.

## 7. Provenance

Every place carries `source: "QLOO"` or `source: "SIMULATED"` and the interface shows it on each card. If Qloo cannot be reached the app says so
and shows clearly labelled made-up places. When no Qloo key is set, a "SIMULATED TASTE DATA, NOT QLOO" banner shows on every page.
