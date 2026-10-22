import { bayIdFromLabel, bayLabel } from "@/utils/bayLabel";

export type SpokenBayResult =
  | { kind: "match"; id: string; label: string }
  | { kind: "unavailable"; label: string }
  | { kind: "none" };

// Speech recognisers often return the *sound* of a row letter ("see seven" for "C7").
const LETTER_WORDS: Record<string, string> = {
  ay: "a", eh: "a", alpha: "a",
  bee: "b", be: "b", bravo: "b",
  see: "c", sea: "c", si: "c", charlie: "c",
  dee: "d", de: "d", delta: "d",
  eee: "e", echo: "e",
  eff: "f", ef: "f", foxtrot: "f",
  gee: "g", golf: "g",
  aitch: "h", hotel: "h",
  eye: "i", india: "i",
};

const NUMBER_WORDS: Record<string, number> = {
  one: 1, won: 1, two: 2, to: 2, too: 2, three: 3, four: 4, for: 4, five: 5, six: 6,
  seven: 7, eight: 8, ate: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
};

const asNumber = (token: string | undefined): number | null => {
  if (!token) return null;
  if (/^\d{1,2}$/.test(token)) return Number(token);
  return NUMBER_WORDS[token] ?? null;
};

/**
 * Turn what the driver said ("bay C 7", "see seven", "SP-14") into one of the
 * currently available bay ids. Only labels that exist are ever returned.
 */
export function parseSpokenBay(transcript: string, availableIds: readonly string[]): SpokenBayResult {
  const text = transcript.toLowerCase().replace(/[.,!?]/g, " ");

  const direct = text.match(/\bs\.?\s*p[\s-]*(\d{1,2})\b/);
  if (direct?.[1]) {
    const id = `SP-${direct[1].padStart(2, "0")}`;
    if (availableIds.includes(id)) return { kind: "match", id, label: bayLabel(id) };
    return { kind: "unavailable", label: bayLabel(id) };
  }

  // "c7" / "c-7" glued together, otherwise split to tokens.
  const tokens = text
    .replace(/\b([a-i])[-\s]?(\d{1,2})\b/g, "$1 $2")
    .split(/[\s-]+/)
    .filter(Boolean);

  for (let i = 0; i < tokens.length - 1; i++) {
    const raw = tokens[i] as string;
    const letter = /^[a-i]$/.test(raw) ? raw : LETTER_WORDS[raw];
    if (!letter) continue;
    const number = asNumber(tokens[i + 1]);
    if (number === null) continue;
    const label = `${letter.toUpperCase()}${number}`;
    const id = bayIdFromLabel(label);
    if (!id) continue;
    return availableIds.includes(id) ? { kind: "match", id, label } : { kind: "unavailable", label };
  }
  return { kind: "none" };
}
