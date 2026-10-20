"use client";

import { useProfile, toggle } from "@/components/profile-context";
import { StepNav } from "@/components/step-nav";
import { TasteMap } from "@/components/taste-map";
import { CITY_OPTIONS, CUISINE_OPTIONS, DEFAULT_CITY, DISH_OPTIONS, EXAMPLES } from "@/lib/profile";

export default function TastesPage() {
  const { profile, update, replace, reset, ready } = useProfile();

  return (
    <>
      <h1><span aria-hidden="true">👤</span> Person: Tastes</h1>
      <p className="lead">What does this person love to eat? Qloo will use these tastes to find places that fit them.</p>

      <section className="card warm" aria-label="Start from an example">
        <h2>Quick start with a fictional example</h2>
        <div className="grid three">
          {EXAMPLES.map((e) => (
            <div key={e.id}>
              <button className="btn" onClick={() => replace(e.profile)}>Load {e.profile.name}</button>
              <p className="small muted">{e.blurb}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-label="Name">
        <h2>Name</h2>
        <label htmlFor="name">A first name or nickname (fictional, letters only)</label>
        <input
          id="name"
          className="input"
          value={profile.name}
          maxLength={30}
          autoComplete="off"
          placeholder="For example, Rosa"
          onChange={(e) => update({ name: e.target.value.replace(/[^\p{L} '-]/gu, "").replace(/^[^\p{L}]+/u, "").slice(0, 30) })}
        />
        <p className="small muted">Please do not use a real person’s name or any real health details.</p>
      </section>

      <section className="card" aria-label="City">
        <h2><span aria-hidden="true">📍</span> Where?</h2>
        <label htmlFor="city">Which city should we look for restaurants in?</label>
        <select id="city" className="input" value={profile.city ?? DEFAULT_CITY} onChange={(e) => update({ city: e.target.value })}>
          {CITY_OPTIONS.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <p className="small muted">Restaurants are searched within 5 km of the city centre.</p>
      </section>

      <section className="card" aria-label="Favourite cuisines">
        <h2>Favourite cuisines</h2>
        <p className="muted">Choose all that apply.</p>
        <div className="grid tiles" role="group" aria-label="Favourite cuisines">
          {CUISINE_OPTIONS.map((c) => {
            const on = profile.cuisines.includes(c.id);
            return (
              <button key={c.id} className={`tile${on ? " on" : ""}`} aria-pressed={on} onClick={() => update({ cuisines: toggle(profile.cuisines, c.id) })}>
                <span className="icon" aria-hidden="true">{c.icon}</span>
                <span>{c.label}</span>
                <span className="tick" aria-hidden="true">{on ? "✓" : ""}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="card" aria-label="Favourite dishes">
        <h2>Favourite dishes</h2>
        <p className="muted">Optional. Dishes help the match.</p>
        <div className="chips" role="group" aria-label="Favourite dishes">
          {DISH_OPTIONS.map((d) => {
            const on = profile.dishes.includes(d.id);
            return (
              <button key={d.id} className={`pill${on ? " on" : ""}`} aria-pressed={on} onClick={() => update({ dishes: toggle(profile.dishes, d.id) })}>
                {on ? "✓ " : ""}{d.label}
              </button>
            );
          })}
        </div>
      </section>

      <TasteMap />

      <StepNav next={{ href: "/person/medicines", label: "Next: Medicines" }} />
      {ready && (
        <p>
          <button className="linklike" onClick={reset}>Clear this profile</button>
        </p>
      )}
    </>
  );
}
