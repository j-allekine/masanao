"use client";

import { Ellipsis } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ActivityActionsMenu({
  activityName,
  actionButtonId,
}: {
  activityName: string;
  actionButtonId: string;
}) {
  return (
    <Button
      type="button"
      id={actionButtonId}
      variant="ghost"
      size="icon-sm"
      aria-label={`Actions for ${activityName}`}
      disabled
      title="Activity actions will be available in a later workflow."
    >
      <Ellipsis />
    </Button>
  );
}
