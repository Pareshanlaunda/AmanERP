import { redirect } from "next/navigation";

/** Bootstrap removed — admin already exists. */
export default function SetupPage() {
  redirect("/login");
}
