import { redirect } from "next/navigation"

// No login for the tool itself — it opens straight on the dashboard.
export default function Home() {
  redirect("/dashboard")
}
