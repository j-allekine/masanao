"use client";

import { useSyncExternalStore } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDisplayNumber } from "@/lib/format-display-number";

export type DisplayUnitConversion = { id: string; baseUnitQuantity: string; alternateUnit: { name: string; abbreviation: string } };

const displayUnitChange = "masanao:inventory-display-unit";
const displayUnitPrefix = "masanao:inventory-display-unit:";

function subscribeToDisplayUnits(notify: () => void) {
  window.addEventListener(displayUnitChange, notify);
  window.addEventListener("storage", notify);
  return () => {
    window.removeEventListener(displayUnitChange, notify);
    window.removeEventListener("storage", notify);
  };
}

export function useItemDisplayUnit(item: {
  id: string; name: string; baseUnit: { name: string; abbreviation: string }; unitConversions: DisplayUnitConversion[];
}) {
  const key = displayUnitPrefix + item.id;
  const preferred = useSyncExternalStore(subscribeToDisplayUnits, () => {
    try { return localStorage.getItem(key) ?? "base"; }
    catch { return "base"; }
  }, () => "base");
  const options = item.unitConversions.filter(({ baseUnitQuantity }) => /^\d+(?:\.\d+)?$/.test(baseUnitQuantity) && /[1-9]/.test(baseUnitQuantity));
  const conversion = options.find(({ id }) => id === preferred);
  const unit = conversion?.alternateUnit ?? item.baseUnit;
  const factor = conversion?.baseUnitQuantity;
  const selector = options.length ? (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="xs" aria-label={`Display unit for ${item.name}: ${unit.name}`} />}>
        {unit.abbreviation}<ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label="Display unit" className="max-w-[calc(100vw-2rem)]">
        <DropdownMenuRadioGroup value={conversion?.id ?? "base"} onValueChange={(value) => {
          try { localStorage.setItem(key, value); }
          catch { return; }
          window.dispatchEvent(new Event(displayUnitChange));
        }}>
          <DropdownMenuRadioItem value="base" className="whitespace-normal">
            <span className="min-w-0 wrap-anywhere">{item.baseUnit.name}</span>
          </DropdownMenuRadioItem>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id} className="whitespace-normal">
              <span className="min-w-0 wrap-anywhere">{option.alternateUnit.name}
              {(option.alternateUnit.name === item.baseUnit.name || options.some((other) => other.id !== option.id && other.alternateUnit.name === option.alternateUnit.name))
                ? ` (${formatDisplayNumber(option.baseUnitQuantity)} ${item.baseUnit.abbreviation})`
                : ""}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
  return { unit, factor, selector };
}
