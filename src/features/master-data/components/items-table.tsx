import { PackageOpen } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { ItemListItem } from "../types";
import MasterDataTableFrame from "./master-data-table-frame";

function ItemStatus({ isActive }: { isActive: boolean }) {
  return <Badge variant={isActive ? "default" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>;
}

function ItemMobileCard({ item }: { item: ItemListItem }) {
  return (
    <Card size="sm" data-item-id={item.id}>
      <CardHeader>
        <CardTitle className="break-words">{item.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="text-label font-semibold text-muted-foreground">
            Category
          </span>
          <span className="min-w-0 break-words text-right">{item.category.name}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-label font-semibold text-muted-foreground">
            Base Unit
          </span>
          <span className="min-w-0 break-words text-right">{item.baseUnit.name}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-label font-semibold text-muted-foreground">
            Status
          </span>
          <ItemStatus isActive={item.isActive} />
        </div>
      </CardContent>
    </Card>
  );
}

function ItemRow({ item }: { item: ItemListItem }) {
  return (
    <TableRow className="hover:bg-muted/35" data-item-id={item.id}>
      <TableCell className="max-w-[22rem] whitespace-normal align-top">
        <span className="block break-words">{item.name}</span>
      </TableCell>
      <TableCell className="max-w-[18rem] whitespace-normal align-top">
        <span className="block break-words">{item.category.name}</span>
      </TableCell>
      <TableCell className="max-w-[18rem] whitespace-normal align-top">
        <span className="block break-words">{item.baseUnit.name}</span>
      </TableCell>
      <TableCell className="text-center">
        <ItemStatus isActive={item.isActive} />
      </TableCell>
    </TableRow>
  );
}

export default function ItemsTable({
  items,
  hasFilters,
  onClearFilters,
}: {
  items: ItemListItem[];
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (items.length === 0) {
    return (
      <Empty className="min-h-60 rounded-lg border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <PackageOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>
            {hasFilters ? "No Items match your current filters." : "No Items yet."}
          </EmptyTitle>
          <EmptyDescription>
            {hasFilters
              ? "Clear filters to see the complete Items list."
              : "Items will appear here once the supply catalog is configured."}
          </EmptyDescription>
        </EmptyHeader>
        {hasFilters ? (
          <EmptyContent>
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:hidden" data-items-mobile>
        {items.map((item) => (
          <ItemMobileCard key={item.id} item={item} />
        ))}
      </div>
      <div className="hidden sm:block" data-items-table-desktop>
        <MasterDataTableFrame caption="Items" className="min-w-[40rem]">
          <TableHeader className="bg-muted/60">
            <TableRow>
              <TableHead scope="col" className="text-left">
                Name
              </TableHead>
              <TableHead scope="col" className="text-left">
                Category
              </TableHead>
              <TableHead scope="col" className="text-left">
                Base Unit
              </TableHead>
              <TableHead scope="col" className="text-center">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </TableBody>
        </MasterDataTableFrame>
      </div>
    </>
  );
}
