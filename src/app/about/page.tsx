import Link from "next/link";
import { SIMULATED_BANNER, qlooConfigured } from "@/taste";

export const metadata = { title: "About · SafePlate" };

export default function AboutPage() {
  const simulated = !qlooConfigured();
  return (
    <>
      <h1><span aria-hidden="true">ℹ️</span> About SafePlate</h1>

      <section className="card warm">
        <h2><span aria-hidden="true">🧭</span> How Qloo is used</h2>
        <p>
          Qloo is a taste-intelligence service. SafePlate uses it to answer: <em>which cuisines and places fit this
          person’s real taste?</em> The favourite cuisines and dishes you choose become the taste signals, and Qloo ranks
          places by how well they match.
        </p>
        <p>Qloo only ranks by taste. It does not decide what is safe. That is the job of the written safety rules.</p>
        {simulated ? (
          <p className="banner"><strong>{SIMULATED_BANNER}.</strong> Right now the places and scores come from a clearly labelled stand-in with made-up places. The real Qloo connection will replace it.</p>
        ) : (
          <p>
            <strong>Qloo is connected.</strong> The restaurants are real businesses near the city you choose, ranked by Qloo’s affinity to the
            person’s favourite cuisines. If Qloo cannot be reached, the app says so and shows clearly labelled made-up places instead.
            SafePlate is not affiliated with these restaurants. Dishes are typical for the cuisine, not their menu, so always check with the restaurant.
          </p>
        )}
      </section>

      <section className="card">
        <h2><span aria-hidden="true">🛡️</span> How safety works</h2>
        <p>
          Every suggested dish is checked against rules that connect foods to medicines, conditions and eating needs,
          for example grapefruit with some statins, or hard foods when chewing is difficult. The result is one of:
          no concerns found, caution, swap suggested, or excluded, always with the reason.
        </p>
        <p>
          The rules were reviewed by a pharmacy assistant with 20 years of community pharmacy experience.{" "}
          <Link href="/safety/reviewers">See who reviewed the rules</Link>.
        </p>
      </section>

      <section className="card">
        <h2><span aria-hidden="true">🤖</span> Where AI is used</h2>
        <p>
          An AI model helps explore cuisines and writes short, friendly wording. It never decides what is excluded or
          cautioned. If it is unavailable, plain wording is used and the app still works.
        </p>
      </section>

      <section className="card">
        <h2><span aria-hidden="true">⚠️</span> Not medical advice</h2>
        <p>
          SafePlate is a hackathon demo. It is not medical advice and does not replace a pharmacist, doctor or speech and
          language therapist. Dishes are typical for a cuisine, not the exact menu of any place, so always check the menu.
          Ask your pharmacist or doctor.
        </p>
      </section>

      <section className="card">
        <h2><span aria-hidden="true">🎭</span> Fictional data</h2>
        <p>
          All people are made up. Please do not enter real names or real health details. Dishes are typical for a cuisine, and restaurants (when Qloo is connected) are real businesses. Your profile
          stays in your own browser and is not saved on a server.
        </p>
      </section>

      <p className="small muted">Open source under the MIT licence.</p>
    </>
  );
}
