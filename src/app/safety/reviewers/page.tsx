import { RuleCard } from "@/components/rule-card";
import { getActiveRules } from "@/safety";

export const metadata = { title: "Who reviewed the rules · SafePlate" };

export default function ReviewersPage() {
  const active = getActiveRules();
  const dates = [...new Set(active.rules.map((r) => r.reviewed_on).filter(Boolean))].sort();
  const groupCount = Object.keys(active.groups).length;

  return (
    <>
      <h1><span aria-hidden="true">✅</span> Safety: Who reviewed the rules</h1>
      <section className="card warm">
        <h2>The reviewer</h2>
        <p>
          Every rule and every medicine group was reviewed by <strong>a pharmacy assistant with 20 years of community
          pharmacy experience</strong>. Review dates: {dates.join(", ")}.
        </p>
        <ul>
          <li>{active.rules.length} rules in use, {active.inactive.length} waiting for review.</li>
          <li>{groupCount} medicine groups in use.</li>
        </ul>
      </section>

      <section className="card">
        <h2>How the review works</h2>
        <ol>
          <li>The rules are written in plain language and shown to the reviewer first.</li>
          <li>A rule is used by the app only after the reviewer marks it approved. The same applies to each medicine group.</li>
          <li>The safety checks are fixed rules in code. An AI model never decides what is excluded or cautioned.</li>
          <li>Sources are named for each rule. They were named from general knowledge and still need checking.</li>
        </ol>
        <p className="notice">This is a hackathon demo with fictional data. It is not medical advice. Ask your pharmacist or doctor.</p>
      </section>

      <h2>Every rule, with its reviewer</h2>
      {active.rules.map((r) => <RuleCard key={r.id} r={r} showReview />)}
    </>
  );
}
