"use client";

import type { LineType, SortOrder } from "@/lib/types";

type Props = {
  radiusKm: number;
  onRadiusChange: (value: number) => void;
  lineType: "ALL" | LineType;
  onLineTypeChange: (value: "ALL" | LineType) => void;
  sort: SortOrder;
  onSortChange: (value: SortOrder) => void;
};

export default function FilterBar({
  radiusKm,
  onRadiusChange,
  lineType,
  onLineTypeChange,
  sort,
  onSortChange
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-brand/15 bg-white p-3 shadow-sm sm:grid-cols-3">
      <label className="text-sm">
        <span className="mb-1 block font-medium">Radius</span>
        <select
          value={radiusKm}
          onChange={(e) => onRadiusChange(Number(e.target.value))}
          className="w-full rounded-lg border border-brand/20 px-3 py-2"
        >
          <option value={1}>1 km</option>
          <option value={2}>2 km</option>
          <option value={3}>3 km</option>
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-medium">Line Type</span>
        <select
          value={lineType}
          onChange={(e) => onLineTypeChange(e.target.value as "ALL" | LineType)}
          className="w-full rounded-lg border border-brand/20 px-3 py-2"
        >
          <option value="ALL">All</option>
          <option value="LRT">LRT</option>
          <option value="MRT">MRT</option>
          <option value="ERL">ERL</option>
        </select>
      </label>

      <label className="text-sm">
        <span className="mb-1 block font-medium">Sort</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SortOrder)}
          className="w-full rounded-lg border border-brand/20 px-3 py-2"
        >
          <option value="nearest">Nearest</option>
          <option value="farthest">Farthest</option>
        </select>
      </label>
    </div>
  );
}
