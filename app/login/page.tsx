import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <LoginForm />
      <p className="mt-8 text-center text-sm text-muted-foreground">
        First time here?{" "}
        <Link href="/setup" className="font-medium text-primary hover:underline">
          Create admin account
        </Link>
      </p>
    </main>
  );
}
