/** A small emoji for a dish, from its name and tags. Decoration only; it never affects a safety decision. */
const ICONS: [RegExp, string][] = [
  [/\bpizza\b/, "🍕"],
  [/tiramisu|pudding|baklava|cake|sorbet|dessert/, "🍰"],
  [/lassi|juice|smoothie/, "🥤"],
  [/breakfast|egg/, "🍳"],
  [/soup|miso|broth|congee/, "🥣"],
  [/udon|noodle/, "🍜"],
  [/curry|korma|saag|tikka|\bdal\b/, "🍛"],
  [/pasta|cannelloni|ragu|spaghetti|lasagne/, "🍝"],
  [/risotto|\brice\b/, "🍚"],
  [/salad/, "🥗"],
  [/squid|shellfish|prawn/, "🦑"],
  [/fish|salmon|cod|tuna/, "🐟"],
  [/pie\b/, "🥧"],
  [/steak|beef|roast|lamb|stew|chop|pork|chicken/, "🍖"],
  [/tofu|vegetable|pickle/, "🥬"],
  [/moussaka|kleftiko/, "🍆"],
];

export function dishEmoji(name: string, tags: string[] = []): string {
  const text = `${name} ${tags.join(" ")}`.toLowerCase();
  for (const [re, icon] of ICONS) if (re.test(name.toLowerCase())) return icon;
  for (const [re, icon] of ICONS) if (re.test(text)) return icon;
  return "🍽️";
}
