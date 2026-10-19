import { z } from "zod";
import groupFileJson from "../../rules/medicine-groups.json";
import type { Condition, GroupFile, Need } from "@/safety/types";
import type { DemoPerson } from "@/data/demo-profiles";

/** A fictional profile built by the user. Only fixed choices are allowed, never free text (except the name). */
export interface UserProfile {
  name: string;
  cuisines: string[];
  dishes: string[];
  medicineGroups: string[];
  conditions: Condition[];
  needs: Need[];
}

export const CUISINE_OPTIONS = [
  { id: "italian", label: "Italian", icon: "🍝" },
  { id: "indian", label: "Indian", icon: "🍛" },
  { id: "chinese", label: "Chinese", icon: "🥢" },
  { id: "british", label: "British", icon: "🥧" },
  { id: "greek", label: "Greek", icon: "🥗" },
  { id: "japanese", label: "Japanese", icon: "🍜" },
] as const;

export const DISH_OPTIONS = [
  { id: "pasta", label: "Pasta" },
  { id: "risotto", label: "Risotto" },
  { id: "pizza", label: "Pizza" },
  { id: "curry", label: "Curry" },
  { id: "dal", label: "Dal" },
  { id: "congee", label: "Congee" },
  { id: "dumplings", label: "Dumplings" },
  { id: "roast", label: "Roast dinner" },
  { id: "pie", label: "Pie" },
  { id: "moussaka", label: "Moussaka" },
  { id: "salad", label: "Salad" },
  { id: "miso", label: "Miso soup" },
  { id: "udon", label: "Udon noodles" },
] as const;

export const CONDITION_OPTIONS: { id: Condition; label: string; hint: string; icon: string }[] = [
  { id: "hypertension", label: "High blood pressure", hint: "Hypertension", icon: "❤️" },
  { id: "heart_failure", label: "Heart failure", hint: "Fluid and salt matter", icon: "🫀" },
  { id: "kidney_disease", label: "Kidney disease", hint: "Potassium matters", icon: "💧" },
  { id: "diabetes", label: "Diabetes", hint: "Sugar and starch matter", icon: "🩸" },
];

export const NEED_OPTIONS: { id: Need; label: string; hint: string; icon: string }[] = [
  { id: "dysphagia", label: "Swallowing difficulty", hint: "Dysphagia", icon: "🥄" },
  { id: "easy_to_chew", label: "Chewing problems", hint: "Needs easy-to-chew food", icon: "🦷" },
  { id: "dry_mouth", label: "Dry mouth", hint: "Dry or sticky food is hard", icon: "💬" },
];

const groups = (groupFileJson as unknown as GroupFile).groups;

/** Only medicine groups the reviewer has approved can be chosen. */
export const MEDICINE_GROUP_OPTIONS = Object.entries(groups)
  .filter(([, g]) => g.reviewed === true)
  .map(([id, g]) => ({ id, label: g.label, members: g.members }));

const cuisineIds = CUISINE_OPTIONS.map((c) => c.id) as [string, ...string[]];
const dishIds = DISH_OPTIONS.map((d) => d.id) as [string, ...string[]];
const groupIds = MEDICINE_GROUP_OPTIONS.map((g) => g.id) as [string, ...string[]];
const conditionIds = CONDITION_OPTIONS.map((c) => c.id) as [Condition, ...Condition[]];
const needIds = NEED_OPTIONS.map((n) => n.id) as [Need, ...Need[]];

export const NAME_PATTERN = /^[\p{L}][\p{L} '-]{0,29}$/u;

export const userProfileSchema = z.object({
  name: z.string().trim().regex(NAME_PATTERN),
  cuisines: z.array(z.enum(cuisineIds)).max(cuisineIds.length),
  dishes: z.array(z.enum(dishIds)).max(dishIds.length),
  medicineGroups: z.array(z.enum(groupIds)).max(groupIds.length),
  conditions: z.array(z.enum(conditionIds)).max(conditionIds.length),
  needs: z.array(z.enum(needIds)).max(needIds.length),
});

export const EMPTY_PROFILE: UserProfile = {
  name: "",
  cuisines: [],
  dishes: [],
  medicineGroups: [],
  conditions: [],
  needs: [],
};

export function toDemoPerson(p: UserProfile, id = "custom"): DemoPerson {
  return {
    id,
    profile: {
      name: `${p.name || "Guest"} (fictional)`,
      medicines: [],
      medicineGroups: p.medicineGroups,
      conditions: p.conditions,
      needs: p.needs,
    },
    taste: {
      likedCuisines: p.cuisines,
      likedPlaces: [],
      likedDishes: p.dishes,
      location: { lat: 51.5, lon: -0.12 },
    },
  };
}

/** Fictional examples a user can load as a starting point. */
export const EXAMPLES: { id: string; blurb: string; profile: UserProfile }[] = [
  {
    id: "margaret",
    blurb: "Loves Italian and Greek food. Takes a statin, a blood-pressure tablet and warfarin.",
    profile: {
      name: "Margaret",
      cuisines: ["italian", "greek"],
      dishes: ["pasta", "moussaka"],
      medicineGroups: ["statins_grapefruit", "bp_and_water_tablets", "raas_potassium", "warfarin"],
      conditions: ["hypertension"],
      needs: [],
    },
  },
  {
    id: "george",
    blurb: "Enjoys a roast and a curry. Has diabetes and chewing problems.",
    profile: {
      name: "George",
      cuisines: ["british", "indian"],
      dishes: ["roast", "curry"],
      medicineGroups: ["metformin", "sedatives", "levothyroxine"],
      conditions: ["diabetes"],
      needs: ["easy_to_chew"],
    },
  },
  {
    id: "dorothy",
    blurb: "Likes congee and udon. Heart failure and swallowing difficulty.",
    profile: {
      name: "Dorothy",
      cuisines: ["chinese", "japanese"],
      dishes: ["congee", "udon"],
      medicineGroups: ["tetracycline_quinolone_antibiotics", "bp_and_water_tablets"],
      conditions: ["heart_failure"],
      needs: ["dysphagia"],
    },
  },
];

export function profileSummary(p: UserProfile): string[] {
  const out: string[] = [];
  const label = (list: readonly { id: string; label: string }[], ids: string[]) =>
    ids.map((i) => list.find((x) => x.id === i)?.label ?? i);
  if (p.cuisines.length) out.push(`Likes: ${label(CUISINE_OPTIONS, p.cuisines).join(", ")} food`);
  if (p.dishes.length) out.push(`Favourite dishes: ${label(DISH_OPTIONS, p.dishes).join(", ")}`);
  if (p.medicineGroups.length)
    out.push(`Medicines: ${p.medicineGroups.map((g) => groups[g]?.label ?? g).join("; ")}`);
  if (p.conditions.length) out.push(`Conditions: ${label(CONDITION_OPTIONS, p.conditions).join(", ")}`);
  if (p.needs.length) out.push(`Eating needs: ${label(NEED_OPTIONS, p.needs).join(", ")}`);
  return out;
}
