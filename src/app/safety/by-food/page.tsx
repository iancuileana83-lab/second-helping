import { FoodSearch, type FoodEntry } from "@/components/food-search";
import { ACTION_LABEL, ruleNumber } from "@/lib/rule-view";
import { getActiveRules } from "@/safety";

export const metadata = { title: "Safety by food · Second Helping" };

export default function ByFoodPage() {
  const { rules } = getActiveRules();
  const map = new Map<string, FoodEntry>();
  for (const r of rules) {
    for (const food of r.food) {
      const key = food.toLowerCase();
      let e = map.get(key);
      if (!e) {
        e = { food, search: key, rules: [] };
        map.set(key, e);
      }
      e.search += " " + r.keywords.join(" ").toLowerCase();
      e.rules.push({
        number: ruleNumber(r),
        action: r.action,
        label: ACTION_LABEL[r.action],
        medicine: r.medicine_group,
        message: r.message,
        swap: r.swap,
      });
    }
  }
  const entries = [...map.values()].sort((a, b) => a.food.localeCompare(b.food));

  return (
    <>
      <h1><span aria-hidden="true">🥗</span> Safety: By food</h1>
      <p className="lead">Look up a food to see which medicines or needs the rules connect it to.</p>
      <p className="notice">Not medical advice. Fictional demo. Ask your pharmacist or doctor about any real medicine.</p>
      <FoodSearch entries={entries} />
    </>
  );
}
