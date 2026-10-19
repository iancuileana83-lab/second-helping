import { redirect } from "next/navigation";

export default function SafetyIndex() {
  redirect("/safety/by-medicine");
}
