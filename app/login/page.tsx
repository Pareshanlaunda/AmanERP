import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { AuthThemeToggle } from "@/components/shared/theme-toggle";
import { BRAND_LOGO_SRC, BRAND_NAME, BRAND_SHORT } from "@/lib/brand";

export default async function LoginPage() {
  return (
    <main className="relative min-h-screen bg-background">
      <AuthThemeToggle />
      <div className="grid min-h-screen lg:grid-cols-[65fr_35fr]">
        {/* Brand plane — logo left (65%) */}
        <section
          aria-label={`${BRAND_NAME} brand`}
          className="relative flex flex-col items-center justify-center bg-black px-6 py-12 pt-[max(3rem,env(safe-area-inset-top))] text-white lg:px-12 lg:py-16"
        >
          <div className="flex w-full max-w-md flex-col items-center text-center">
            <Image
              src={BRAND_LOGO_SRC}
              alt={`${BRAND_NAME} (${BRAND_SHORT}) logo`}
              width={520}
              height={520}
              priority
              className="h-auto w-full max-w-[16rem] sm:max-w-[18rem] lg:max-w-[22rem]"
            />
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
              {BRAND_SHORT}
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-display-face)] text-2xl font-semibold tracking-tight sm:text-3xl">
              {BRAND_NAME}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
              Sign in to manage leads, clients, and legal reply notices.
            </p>
          </div>
        </section>

        {/* Form — right (35%) */}
        <section className="flex flex-col items-center justify-center px-4 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
