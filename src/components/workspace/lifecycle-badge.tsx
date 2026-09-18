import { Badge } from "@/components/ui/badge";

export default function WorkspaceLifecycleBadge({
  isActive,
}: {
  isActive: boolean;
}) {
  return (
    <Badge variant={isActive ? "default" : "outline"}>
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
