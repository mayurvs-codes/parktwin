/**
 * Row letter + consecutive number for every bay of the 60-bay B2 floor plan.
 * Rows are lettered top to bottom (A..I); numbers run left to right (top to
 * bottom for the vertical west columns). Internal ids (SP-NN) never change.
 */
const LABEL_BY_ID: Record<string, string> = {
  "SP-01": "C1",
  "SP-02": "C2",
  "SP-03": "C3",
  "SP-04": "C4",
  "SP-05": "C5",
  "SP-06": "C6",
  "SP-07": "C7",
  "SP-08": "C8",
  "SP-09": "D1",
  "SP-10": "D2",
  "SP-11": "D3",
  "SP-12": "D4",
  "SP-13": "D5",
  "SP-14": "D6",
  "SP-15": "D7",
  "SP-16": "D8",
  "SP-17": "B1",
  "SP-18": "B2",
  "SP-19": "B3",
  "SP-20": "B4",
  "SP-21": "A1",
  "SP-22": "A2",
  "SP-23": "A3",
  "SP-24": "A4",
  "SP-25": "A5",
  "SP-26": "A6",
  "SP-27": "A7",
  "SP-28": "A8",
  "SP-29": "A9",
  "SP-30": "A10",
  "SP-31": "A11",
  "SP-32": "A12",
  "SP-33": "A13",
  "SP-34": "G1",
  "SP-35": "G2",
  "SP-36": "G3",
  "SP-37": "G4",
  "SP-38": "G5",
  "SP-39": "G6",
  "SP-40": "G7",
  "SP-41": "G8",
  "SP-42": "F1",
  "SP-43": "F2",
  "SP-44": "H1",
  "SP-45": "H2",
  "SP-46": "H3",
  "SP-47": "H4",
  "SP-48": "H5",
  "SP-49": "H6",
  "SP-50": "H7",
  "SP-51": "H8",
  "SP-52": "I1",
  "SP-53": "I2",
  "SP-54": "I3",
  "SP-55": "I4",
  "SP-56": "I5",
  "SP-57": "E1",
  "SP-58": "E2",
  "SP-59": "E3",
  "SP-60": "E4",
};

const LABEL_BY_KEY: Record<string, string> = {};
for (const [id, label] of Object.entries(LABEL_BY_ID)) {
  LABEL_BY_KEY[id] = label;
  // legacy alias: SP-07 <-> P07
  LABEL_BY_KEY["P" + id.slice(3)] = label;
}

const ID_BY_LABEL: Record<string, string> = {};
for (const [id, label] of Object.entries(LABEL_BY_ID)) ID_BY_LABEL[label] = id;

/** Inverse of bayLabel: "C7" -> "SP-07" (undefined when the label is unknown). */
export function bayIdFromLabel(label: string): string | undefined {
  return ID_BY_LABEL[label.trim().toUpperCase()];
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
