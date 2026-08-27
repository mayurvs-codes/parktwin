import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { REPORT_CATEGORIES } from "./reportConfig";

interface ReportFiltersProps {
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

/**
 * Presentation-only filters for the report history list: a type dropdown and a
 * free-text search over report id / title. Both filter the already-fetched
 * history client-side — they never hit the backend themselves.
 */
export function ReportFilters({
  typeFilter,
  onTypeFilterChange,
  search,
  onSearchChange,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-[220px]">
        <Select
          aria-label="Filter by report type"
          value={typeFilter}
          onChange={e => onTypeFilterChange(e.target.value)}
        >
          <option value="all">All types</option>
          {REPORT_CATEGORIES.map(c => (
            <option key={c.type} value={c.type}>
              {c.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="relative w-full sm:max-w-[280px]">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by id or title…"
          aria-label="Search reports"
          className="pl-9"
        />
      </div>
    </div>
  );
}
