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
  pee: "p", tee: "t", vee: "v", zee: "z", zed: "z",
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

// Letters a speech engine commonly confuses with each other ("bee" heard as "dee"/"pee"/"see"...).
const SOUND_ALIKE: string[] = ["bcdegptvz", "ajk", "fsx", "mn", "iy"];
const sameSound = (a: string, b: string): boolean =>
  a === b || SOUND_ALIKE.some((g) => g.includes(a) && g.includes(b));

const ORDINALS: Record<string, number> = {
  first: 0, "1st": 0, second: 1, "2nd": 1, third: 2, "3rd": 2, fourth: 3, "4th": 3, fifth: 4, "5th": 4,
};

/**
 * Turn what the driver said ("bay C 7", "see seven", "bravo one", "SP-14") into one of the
 * currently available bay ids. Only available bays are ever returned as a match.
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
    .replace(/\b([a-z])[-\s]?(\d{1,2})\b/g, "$1 $2")
    .split(/[\s-]+/)
    .filter(Boolean);

  // Ordinal pick from the free bays: "first", "second bay"...
  for (const t of tokens) {
    const idx = ORDINALS[t];
    const id = idx === undefined ? undefined : availableIds[idx];
    if (id) return { kind: "match", id, label: bayLabel(id) };
  }

  let heardLetter: string | null = null;
  let heardNumber: number | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i] as string;
    const letter = /^[a-z]$/.test(raw) ? raw : LETTER_WORDS[raw];
    const number = asNumber(tokens[i + 1]);
    if (letter && number !== null) {
      heardLetter = letter;
      heardNumber = number;
      break;
    }
  }
  if (heardNumber === null) {
    // Only a number was understood ("bay one"): use it if exactly one free bay has that number.
    for (const t of tokens) {
      const n = asNumber(t);
      if (n !== null) {
        heardNumber = n;
        break;
      }
    }
  }
  if (heardNumber === null) return { kind: "none" };

  if (heardLetter) {
    const label = `${heardLetter.toUpperCase()}${heardNumber}`;
    const id = bayIdFromLabel(label);
    if (id && availableIds.includes(id)) return { kind: "match", id, label };
  }

  // Fuzzy: same number, and (when a letter was heard) a sound-alike row letter; must be unambiguous.
  const candidates = availableIds.filter((id) => {
    const label = bayLabel(id);
    if (Number(label.slice(1)) !== heardNumber) return false;
    return heardLetter ? sameSound(label.charAt(0).toLowerCase(), heardLetter) : true;
  });
  if (candidates.length === 1) {
    const id = candidates[0] as string;
    return { kind: "match", id, label: bayLabel(id) };
  }

  if (heardLetter) {
    const label = `${heardLetter.toUpperCase()}${heardNumber}`;
    if (bayIdFromLabel(label)) return { kind: "unavailable", label };
  }
  return { kind: "none" };
}
