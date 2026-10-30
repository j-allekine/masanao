import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

/** Missing routes cannot assume an authenticated identity or a module owner. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col items-start justify-center gap-4 px-6 py-8">
      <h1 className="break-words text-heading-1 font-semibold">Page not found</h1>
      <p className="text-body text-muted-foreground">This page is unavailable. Open the workspace to continue.</p>
      <Link className={buttonVariants({ variant: "outline" })} href="/dashboard">Open workspace</Link>
    </main>
  );
}
