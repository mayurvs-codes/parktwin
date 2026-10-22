import facilityGeometry from "@/config/facility_geometry.json";

interface BayLabelEntry {
  id: string;
  alias?: string;
  label?: string;
}

const LABEL_BY_KEY: Record<string, string> = {};
for (const bay of facilityGeometry.bays as unknown as BayLabelEntry[]) {
  if (!bay.label) continue;
  LABEL_BY_KEY[bay.id.toUpperCase()] = bay.label;
  if (bay.alias) LABEL_BY_KEY[bay.alias.toUpperCase()] = bay.label;
}

/**
 * Human-facing bay label: one letter per row, consecutive numbers within the
 * row (e.g. "B3"). Internal ids (SP-03) and legacy aliases (P03) are mapped;
 * unknown values are returned unchanged.
 */
export function bayLabel(idOrAlias: string | null | undefined): string {
  if (!idOrAlias) return "";
  return LABEL_BY_KEY[idOrAlias.trim().toUpperCase()] ?? idOrAlias;
}

/** Replace every SP-NN / PNN token inside free text (messages, voice lines). */
export function relabelBaysInText(text: string): string {
  return text.replace(/\b(?:SP-\d{2}|P\d{2})\b/g, (m) => bayLabel(m));
}
