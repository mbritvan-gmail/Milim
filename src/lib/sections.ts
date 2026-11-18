import { sectionEnglish } from "./lyrics";

// The section names a person can pick when adding or renaming a section header.
export const SECTION_KINDS = ["Verse", "Pre-chorus", "Chorus", "Bridge", "Intro", "Outro", "Interlude", "Solo"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

// A header is stored as an ordinary line of text in square brackets, e.g. "[Verse 2]" or "[Chorus]".
export function sectionLabel(kind: string, number: number): string {
  return number > 0 ? `[${kind} ${number}]` : `[${kind}]`;
}

// Which name and number an existing header stands for (also understands Hebrew labels like "[בית ב']").
export function describeSection(label: string): { kind: SectionKind | null; number: number } {
  const name = sectionEnglish(label) ?? "";
  const m = name.match(/^(.*?)(?: (\d+))?$/);
  const base = m?.[1] ?? "";
  return { kind: SECTION_KINDS.find((k) => k === base) ?? null, number: m?.[2] ? Number(m[2]) : 0 };
}
