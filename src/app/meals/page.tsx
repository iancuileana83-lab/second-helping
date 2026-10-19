import { redirect } from "next/navigation";

export default function MealsIndex() {
  redirect("/meals/restaurants");
}
