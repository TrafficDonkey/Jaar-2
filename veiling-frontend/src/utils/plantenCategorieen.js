import raw from "../assets/planten_categorieen.txt?raw";

const DEFAULT_OVERIGE_LABEL = "Overige";
const DEFAULT_CATEGORIES = [
  "Kamerplanten",
  "Tuinplanten",
  "Bomen & Heesters",
  "Bollen & Knollen",
  "Succulenten & Cactussen",
  "Water- en Moerasplanten",
  DEFAULT_OVERIGE_LABEL,
];

function isHeading(line) {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed) return false;
  return trimmed === trimmed.toUpperCase();
}

function toTitleCase(text) {
  return String(text)
    .toLowerCase()
    .replace(/\b\p{L}/gu, (m) => m.toUpperCase());
}

function normalizeCategoryLabel(heading) {
  const trimmed = String(heading).trim();
  if (!trimmed) return trimmed;
  if (trimmed.toUpperCase() === "OVERIG") return DEFAULT_OVERIGE_LABEL;
  return toTitleCase(trimmed);
}

export function parsePlantenCategorieen(content = raw) {
  const lines = String(content)
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim());

  const map = new Map();
  let current = null;
  let sawHeading = false;

  for (const line of lines) {
    if (!line) continue;

    if (isHeading(line)) {
      sawHeading = true;
      current = normalizeCategoryLabel(line);
      if (!map.has(current)) map.set(current, []);
      continue;
    }

    if (!current) continue;
    map.get(current).push(line);
  }

  // If the source is a flat list (no headings), treat it as a global product list.
  if (!sawHeading) {
    const uniq = new Map();
    for (const line of lines) {
      if (!line) continue;
      const key = line.toLowerCase();
      if (!uniq.has(key)) uniq.set(key, line);
    }
    const all = Array.from(uniq.values()).sort((a, b) =>
      a.localeCompare(b, "nl-NL")
    );

    const plantsByCategory = Object.fromEntries(
      DEFAULT_CATEGORIES.map((c) => [
        c,
        c === DEFAULT_OVERIGE_LABEL ? [] : all,
      ])
    );

    return {
      categories: DEFAULT_CATEGORIES,
      plantsByCategory,
      overigeLabel: DEFAULT_OVERIGE_LABEL,
    };
  }

  const categories = Array.from(map.keys());
  const overigeIdx = categories.indexOf(DEFAULT_OVERIGE_LABEL);
  if (overigeIdx !== -1) {
    categories.splice(overigeIdx, 1);
    categories.push(DEFAULT_OVERIGE_LABEL);
  }

  const plantsByCategory = Object.fromEntries(
    categories.map((c) => [c, map.get(c) ?? []])
  );

  return { categories, plantsByCategory, overigeLabel: DEFAULT_OVERIGE_LABEL };
}

export const PLANTEN_CATEGORIEEN = parsePlantenCategorieen();
