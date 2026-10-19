import type { Dish } from "@/safety/types";

/**
 * FICTIONAL typical dishes per cuisine, with ingredient and texture tags.
 * Real restaurant menus are not read, so the app says "check the menu".
 */
export const MENUS: Record<string, Dish[]> = {
  italian: [
    { name: "Spinach and ricotta cannelloni", meal: "dinner", tags: ["spinach", "cheese", "soft"] },
    { name: "Slow-cooked beef ragu with pasta", meal: "dinner", tags: ["slow-cooked", "soft", "sauce"] },
    { name: "Tiramisu", meal: "snack", tags: ["alcohol-soaked", "dessert", "coffee", "high-sugar"] },
    { name: "Risotto with white wine", meal: "dinner", tags: ["alcohol-cooked", "rice", "soft"] },
    { name: "Thin-crust pizza with salami", meal: "dinner", tags: ["salami", "cured meat", "high-salt", "crunchy"] },
    { name: "Lemon sorbet", meal: "snack", tags: ["dessert", "high-sugar", "smooth"] },
  ],
  indian: [
    { name: "Saag paneer", meal: "dinner", tags: ["spinach", "cheese", "soft"] },
    { name: "Lentil dal with rice", meal: "dinner", tags: ["soft", "moist"] },
    { name: "Chicken tikka, on the bone", meal: "dinner", tags: ["on-the-bone"] },
    { name: "Mango lassi", meal: "snack", tags: ["yoghurt", "milk", "high-sugar", "smooth"] },
    { name: "Vegetable korma", meal: "dinner", tags: ["soft", "sauce", "nut"] },
  ],
  chinese: [
    { name: "Chicken and sweetcorn congee", meal: "lunch", tags: ["soft", "smooth", "moist"] },
    { name: "Steamed fish with soy sauce", meal: "dinner", tags: ["soy sauce", "high-salt", "small-bones"] },
    { name: "Salt and pepper squid", meal: "dinner", tags: ["high-salt", "crunchy"] },
    { name: "Egg fried rice", meal: "dinner", tags: ["rice", "soy sauce"] },
    { name: "Steamed tofu with vegetables", meal: "dinner", tags: ["soft", "moist"] },
  ],
  british: [
    { name: "Roast beef with Yorkshire pudding", meal: "dinner", tags: ["dry-roast", "tough-meat"] },
    { name: "Fish pie", meal: "dinner", tags: ["soft", "moist", "sauce"] },
    { name: "Beef stew with dumplings", meal: "dinner", tags: ["slow-cooked", "soft", "sauce"] },
    { name: "Full English breakfast", meal: "breakfast", tags: ["bacon", "high-salt", "cured meat", "coffee"] },
    { name: "Sticky toffee pudding", meal: "snack", tags: ["sticky", "toffee", "dessert", "high-sugar"] },
  ],
  greek: [
    { name: "Moussaka", meal: "dinner", tags: ["soft", "cheese", "sauce"] },
    { name: "Greek salad with olives and feta", meal: "lunch", tags: ["olive", "cheese", "high-salt", "raw carrot"] },
    { name: "Lamb kleftiko", meal: "dinner", tags: ["slow-cooked", "soft"] },
    { name: "Honey and walnut baklava", meal: "snack", tags: ["walnut", "crunchy", "high-sugar", "dessert"] },
  ],
  japanese: [
    { name: "Miso soup with tofu", meal: "lunch", tags: ["miso", "fermented", "high-salt", "high-tyramine"] },
    { name: "Udon noodles in light broth", meal: "lunch", tags: ["soft", "moist"] },
    { name: "Grilled salmon, boneless", meal: "dinner", tags: ["soft", "moist"] },
    { name: "Pickled vegetable plate", meal: "snack", tags: ["pickle", "high-salt", "crunchy"] },
  ],
};

export function menuFor(cuisine: string): Dish[] {
  return MENUS[cuisine.toLowerCase()] ?? [];
}
