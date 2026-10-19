import type { Profile } from "@/safety/types";
import type { TasteProfile } from "@/taste/provider";
import { EXAMPLES, toDemoPerson } from "@/lib/profile";

export interface DemoPerson {
  id: string;
  profile: Profile;
  taste: TasteProfile;
}

/** Entirely fictional people. No real patient data. Built from the same examples shown in the app. */
export const DEMO_PEOPLE: DemoPerson[] = EXAMPLES.map((e) => toDemoPerson(e.profile, e.id));

export function getPerson(id: string): DemoPerson | undefined {
  return DEMO_PEOPLE.find((p) => p.id === id);
}
