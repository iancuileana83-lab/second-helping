import type { Place } from "@/taste/provider";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

/**
 * What a place card says about its source. Qloo places are real restaurants, so they show real details
 * and the affiliation notice. Simulated places say so plainly.
 */
export function PlaceInfo({ place }: { place: Place }) {
  const cuisine = cap(place.cuisine);
  if (place.source === "SIMULATED") {
    return (
      <p className="small muted">
        Simulated score {Math.round(place.score * 100)} out of 100 (made up, not Qloo). Typical {cuisine} dishes. Check the menu.
      </p>
    );
  }
  const details = [
    place.address,
    place.rating !== undefined ? `Rating ${place.rating} out of 5` : undefined,
    place.distanceKm !== undefined ? `${place.distanceKm} km away` : undefined,
  ].filter(Boolean);
  return (
    <>
      <p className="small">
        <strong>Qloo affinity score {place.score.toFixed(2)}</strong>
        <span className="muted"> (0 to 1)</span>
        {details.length > 0 && <span className="muted"> · {details.join(" · ")}</span>}
      </p>
      {place.website && (
        <p className="small">
          <a href={place.website} target="_blank" rel="noopener noreferrer">
            Restaurant website (opens in a new tab)
          </a>
        </p>
      )}
      <p className="small muted">
        Qloo scores describe what groups of people with similar tastes tend to enjoy, not what one person will do. Typical {cuisine} dishes, not this restaurant’s menu. Second Helping is not affiliated with this restaurant. Always check with
        the restaurant.
      </p>
    </>
  );
}
