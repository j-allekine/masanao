import { Suspense } from "react"

import SidebarPrototype from "@/components/prototypes/sidebar/sidebar-prototype"

export default function SidebarPrototypePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-body-sm text-muted-foreground">
          Loading sidebar prototype…
        </div>
      }
    >
      <SidebarPrototype />
    </Suspense>
  )
}
