"use client";

import { useState } from "react";
import { Check, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/services/reports";
import { useGenerateReport } from "@/hooks/useReports";
import {
  EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
  REPORT_CATEGORIES,
} from "./reportConfig";
import type { ExportFormat, GenerateResponse, ReportType } from "@/types/reports";

interface ReportGeneratorProps {
  selectedType: ReportType;
  onSelectedTypeChange: (type: ReportType) => void;
  onGenerated?: (response: GenerateResponse) => void;
}

/**
 * Report generation form (Module 6 – Phase G).
 *
 * Presentation layer only: it requests a report that the backend already knows
 * how to produce. The type dropdown lists **only** backend-supported report
 * types (`REPORT_CATEGORIES`), and the format toggles are the backend's
 * `EXPORT_FORMATS`. The actual generation runs in the backend `ReportingService`
 * — this component just collects the request and surfaces success/error.
 */
export function ReportGenerator({
  selectedType,
  onSelectedTypeChange,
  onGenerated,
}: ReportGeneratorProps) {
  const [formats, setFormats] = useState<Set<ExportFormat>>(
    new Set(["json", "csv", "pdf"])
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useGenerateReport();

  const toggleFormat = (f: ExportFormat) => {
    setFormats(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (formats.size === 0) {
      setError("Select at least one export format.");
      setSuccess(null);
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const res = await generate.mutateAsync({
        report_type: selectedType,
        formats: [...formats],
      });
      setSuccess(`"${REPORT_CATEGORIES.find(c => c.type === res.type)?.title ?? res.type}" generated (${res.id}).`);
      onGenerated?.(res);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Report</CardTitle>
        <CardDescription>Choose a report type and export formats.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="report-type">
            Report Type
          </label>
          <Select
            id="report-type"
            aria-label="Report type"
            value={selectedType}
            onChange={e => onSelectedTypeChange(e.target.value as ReportType)}
          >
            {REPORT_CATEGORIES.map(c => (
              <option key={c.type} value={c.type}>
                {c.title}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium text-foreground" id="format-label">
            Export Formats
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="format-label">
            {EXPORT_FORMATS.map(f => {
              const active = formats.has(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFormat(f)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" aria-hidden />}
                  {EXPORT_FORMAT_LABELS[f]}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {success}
          </p>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generate.isPending}
          className="w-full sm:w-auto"
        >
          <FilePlus2 className="h-4 w-4" aria-hidden />
          {generate.isPending ? "Generating…" : "Generate Report"}
        </Button>
      </CardContent>
    </Card>
  );
}
