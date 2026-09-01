"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Ellipsis,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ActivityDesignListItem } from "../types";
import ActivityCreateSheet from "./activity-create-sheet";
import ActivityDesignDialog, {
  type ActivityDesignDialogState,
} from "./activity-design-dialog";
import ActivityDesignPagination from "./activity-design-pagination";
import {
  filterActivityDesigns,
  getActivityDesignFilterOptions,
  hasActivityDesignFilters,
  type ActivityDesignFilters,
} from "./activity-design-filters";
import ActivityDesignTable from "./activity-design-table";
import ActivityDesignToolbar from "./activity-design-toolbar";
import PlanningSectionMenu from "./planning-section-menu";

const initialFilters: ActivityDesignFilters = {
  search: "",
  fiscalYear: "",
};

const PAGE_SIZE = 10;

function ActivityDesignBulkToolbar({
  selectedCount,
  onCreate,
  onEdit,
  onClearSelection,
  onRefresh,
}: {
  selectedCount: number;
  onCreate: () => void;
  onEdit: () => void;
  onClearSelection: () => void;
  onRefresh: () => void;
}) {
  const hasSelection = selectedCount > 0;
  const canEdit = selectedCount === 1;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b pb-5">
      <Button
        id="new-activity-design"
        type="button"
        size="sm"
        className="h-9 min-w-[12rem] px-3"
        onClick={() => {
          onClearSelection();
          onCreate();
        }}
      >
        <Plus data-icon="inline-start" />
        Create Activity Design
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={!hasSelection}
        onClick={() => toast.info("Duplicate is not available in the current server contract.")}
      >
        <Copy data-icon="inline-start" />
        Duplicate
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={!canEdit}
        onClick={onEdit}
      >
        <Pencil data-icon="inline-start" />
        Edit
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        disabled={!hasSelection}
        onClick={() => toast.info("Archive is not available in the current server contract.")}
      >
        <Archive data-icon="inline-start" />
        Archive
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="More Activity Design actions"
            />
          }
        >
          <Ellipsis />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuGroup>
            <DropdownMenuItem disabled={!hasSelection} onClick={onClearSelection}>
              <Trash2 />
              Clear selection
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onRefresh}>
              <RefreshCw />
              Refresh list
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function ActivityDesignsWorkspace({
  activityDesigns,
}: {
  activityDesigns: ActivityDesignListItem[];
}) {
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [dialogState, setDialogState] =
    useState<ActivityDesignDialogState | null>(null);
  const [activityDesignForCreate, setActivityDesignForCreate] =
    useState<ActivityDesignListItem | null>(null);
  const filterOptions = useMemo(
    () => getActivityDesignFilterOptions(activityDesigns),
    [activityDesigns],
  );
  const filteredActivityDesigns = useMemo(
    () => filterActivityDesigns(activityDesigns, filters),
    [activityDesigns, filters],
  );
  const pageCount = Math.max(
    1,
    Math.ceil(filteredActivityDesigns.length / PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const firstItemIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedActivityDesigns = filteredActivityDesigns.slice(
    firstItemIndex,
    firstItemIndex + PAGE_SIZE,
  );

  function updateFilters(nextFilters: ActivityDesignFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function clearFilters() {
    setFilters(initialFilters);
    setPage(1);
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleSelection(activityDesignId: string) {
    setSelectedIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(activityDesignId)) {
        nextSelection.delete(activityDesignId);
      } else {
        nextSelection.add(activityDesignId);
      }

      return nextSelection;
    });
  }

  function toggleCurrentPageSelection() {
    const currentPageIds = paginatedActivityDesigns.map(
      (activityDesign) => activityDesign.id,
    );
    const allCurrentPageSelected = currentPageIds.every((id) =>
      selectedIds.has(id),
    );

    setSelectedIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      for (const id of currentPageIds) {
        if (allCurrentPageSelected) {
          nextSelection.delete(id);
        } else {
          nextSelection.add(id);
        }
      }

      return nextSelection;
    });
  }

  function editSelectedDesign() {
    const selectedDesign = activityDesigns.find((activityDesign) =>
      selectedIds.has(activityDesign.id),
    );

    if (selectedDesign) {
      setDialogState({ mode: "edit", activityDesign: selectedDesign });
    }
  }

  function openCreateDialog() {
    setDialogState({ mode: "create" });
  }

  function closeDialog() {
    const closedDialog = dialogState;
    setDialogState(null);

    window.setTimeout(() => {
      const targetId =
        closedDialog?.mode === "edit"
          ? `activity-design-actions-${closedDialog.activityDesign.id}`
          : "new-activity-design";
      document.getElementById(targetId)?.focus();
    }, 0);
  }

  function closeActivityCreateDialog() {
    const closedActivityDesign = activityDesignForCreate;
    setActivityDesignForCreate(null);

    window.setTimeout(() => {
      if (closedActivityDesign) {
        document
          .getElementById(`activity-design-actions-${closedActivityDesign.id}`)
          ?.focus();
      }
    }, 0);
  }

  return (
    <div className="flex flex-col gap-0">
      <ActivityDesignToolbar
        filters={filters}
        options={filterOptions}
        onFiltersChange={updateFilters}
        onClear={clearFilters}
        showClear={hasActivityDesignFilters(filters)}
      />
      <div className="mt-6">
        <PlanningSectionMenu
          selectedCount={selectedIds.size}
          onClearSelection={clearSelection}
        />
      </div>
      <div className="mt-6">
        <ActivityDesignBulkToolbar
          selectedCount={selectedIds.size}
          onCreate={openCreateDialog}
          onEdit={editSelectedDesign}
          onClearSelection={clearSelection}
          onRefresh={() => router.refresh()}
        />
      </div>
      <ActivityDesignTable
        activityDesigns={paginatedActivityDesigns}
        filters={filters}
        onClearFilters={clearFilters}
        onNew={openCreateDialog}
        onEdit={(activityDesign) =>
          setDialogState({ mode: "edit", activityDesign })
        }
        onAddActivity={setActivityDesignForCreate}
        selectedIds={selectedIds}
        allCurrentPageSelected={
          paginatedActivityDesigns.length > 0 &&
          paginatedActivityDesigns.every((activityDesign) =>
            selectedIds.has(activityDesign.id),
          )
        }
        someCurrentPageSelected={
          paginatedActivityDesigns.some((activityDesign) =>
            selectedIds.has(activityDesign.id),
          )
        }
        onToggleSelect={toggleSelection}
        onToggleSelectAll={toggleCurrentPageSelection}
        onDeleted={(activityDesignId) => {
          setSelectedIds((currentSelection) => {
            const nextSelection = new Set(currentSelection);
            nextSelection.delete(activityDesignId);
            return nextSelection;
          });
        }}
      />
      <ActivityDesignPagination
        page={currentPage}
        pageCount={pageCount}
        start={firstItemIndex + 1}
        end={Math.min(firstItemIndex + PAGE_SIZE, filteredActivityDesigns.length)}
        total={filteredActivityDesigns.length}
        onPageChange={setPage}
      />
      <ActivityDesignDialog
        dialogState={dialogState}
        onClose={closeDialog}
        onSuccess={() => router.refresh()}
      />
      <ActivityCreateSheet
        activityDesign={activityDesignForCreate}
        open={activityDesignForCreate !== null}
        onClose={closeActivityCreateDialog}
        onSuccess={(activity) => {
          closeActivityCreateDialog();
          router.refresh();
          const activityDesign = activityDesigns.find(
            (design) => design.id === activity.activityDesignId,
          );
          if (activityDesign) {
            toast.success(`Activity added to “${activityDesign.title}”`);
          }
        }}
      />
    </div>
  );
}
