import { redirect } from "next/navigation";

/** Keep `/login` bookmarks working — same UI lives on `/`. */
export default function LoginPage() {
  redirect("/");
}
