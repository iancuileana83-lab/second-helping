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
        Taste match {Math.round(place.score * 100)} out of 100 (simulated, not Qloo). Typical {cuisine} dishes. Check the menu.
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
        <strong>Qloo affinity {Math.round(place.score * 100)}%</strong>
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
        Typical {cuisine} dishes, not this restaurant’s menu. SafePlate is not affiliated with this restaurant. Always check with
        the restaurant.
      </p>
    </>
  );
}
