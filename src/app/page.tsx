import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { SproutIcon } from "lucide-react";

import { LoginForm } from "@/app/_components/login-form";
import { auth } from "@/server/auth";
import { cn } from "@/lib/utils";

function BrandLockup({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <SproutIcon aria-hidden="true" strokeWidth={1.75} />
      </span>
      <span className={cn(inverse ? "text-masanao-on-primary" : "text-foreground")}>
        <span className="block text-sm font-semibold tracking-tight">Masanao</span>
        <span
          className={cn(
            inverse
              ? "block text-xs text-masanao-primary-soft"
              : "block text-xs text-muted-foreground"
          )}
        >
          Municipal kitchen
        </span>
      </span>
    </div>
  );
}

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) redirect("/overview");

  return (
    <main className="grid min-h-svh lg:grid-cols-2" aria-label="Masanao staff sign-in">
      <aside
        className="relative hidden overflow-hidden bg-muted lg:block"
        aria-labelledby="welcome-title"
      >
        <Image
          src="/images/municipal-kitchen-login-v2.png"
          alt="A municipal kitchen worker preparing vegetables beside a cooking pot"
          fill
          priority
          sizes="50vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-masanao-primary-strong/65 via-masanao-primary-strong/10 to-masanao-primary-strong/90"
          aria-hidden="true"
        />
        <div className="absolute inset-0 flex flex-col justify-between p-10 xl:p-14">
          <BrandLockup inverse />

          <div className="max-w-lg text-masanao-on-primary">
            <p className="text-xs font-semibold tracking-[0.14em] text-masanao-primary-soft uppercase">
              Municipal kitchen operations
            </p>
            <h1
              id="welcome-title"
              className="mt-4 max-w-[12ch] text-4xl font-medium leading-[1.04] tracking-[-0.05em] text-balance xl:text-5xl"
            >
              A clear start for every service day.
            </h1>
            <p className="mt-5 max-w-[38ch] text-base leading-7 text-masanao-primary-soft text-pretty">
              Plan activities, track supplies, and keep accountable records close to the work.
            </p>
          </div>
        </div>
      </aside>

      <section
        className="flex flex-col gap-4 bg-background p-6 md:p-10"
        aria-labelledby="sign-in-title"
      >
        <div className="lg:hidden">
          <BrandLockup />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">
            <LoginForm headingId="sign-in-title" />
          </div>
        </div>
      </section>
    </main>
  );
}
