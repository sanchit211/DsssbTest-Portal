import { redirect } from "next/navigation";

export default function Home() {
  // Middleware handles auth routing, but fallback to login if bypassed
  redirect("/login");
}
