import { ClipboardList, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import type { ActivityDesignListItem } from "../types";

function ActivityDesignListItemCard({
  activityDesign,
}: {
  activityDesign: ActivityDesignListItem;
}) {
  return (
    <li
      className="rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40"
    >
      <article className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium tracking-wide text-primary uppercase">
            {activityDesign.activityDesignNo}
          </p>
          <h3 className="mt-2 truncate text-base font-semibold">
            {activityDesign.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {activityDesign.officeName}
          </p>
        </div>
        <div className="flex shrink-0 flex-row gap-4 text-sm sm:flex-col sm:items-end sm:gap-1">
          <span className="font-medium">FY {activityDesign.fiscalYear}</span>
          <span className="text-muted-foreground">
            {activityDesign.activityCount === 1
              ? "1 Activity"
              : `${activityDesign.activityCount} Activities`}
          </span>
        </div>
      </article>
      {activityDesign.aipReferenceCode ? (
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          AIP Reference Code: {activityDesign.aipReferenceCode}
        </p>
      ) : null}
    </li>
  );
}

export default function ActivityDesignList({
  activityDesigns,
}: {
  activityDesigns: ActivityDesignListItem[];
}) {
  if (activityDesigns.length === 0) {
    return (
      <Empty className="min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No Activity Designs yet</EmptyTitle>
          <EmptyDescription>
            Create the first planning context with its LGU reference number, fiscal year, and office.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            nativeButton={false}
            render={<a href="#create-activity-design-title" />}
          >
            Create the first Activity Design
            <Plus data-icon="inline-end" />
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <ul aria-label="Activity Designs" className="flex flex-col gap-3">
      {activityDesigns.map((activityDesign) => (
        <ActivityDesignListItemCard
          activityDesign={activityDesign}
          key={activityDesign.id}
        />
      ))}
    </ul>
  );
}
