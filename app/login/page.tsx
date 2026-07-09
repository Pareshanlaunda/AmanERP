import { LoginForm } from "@/components/auth/login-form";
import { AuthThemeToggle } from "@/components/shared/theme-toggle";

export default async function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <AuthThemeToggle />
      <LoginForm />
    </main>
  );
}

