import { Heebo } from "next/font/google";

// The Alef-bet tile on Home shows a bold alef set in type (not a drawn icon like the other tiles).
// Heebo 400 is self-hosted by next/font and only loads where this component is used.
const heebo = Heebo({
  subsets: ["hebrew"],
  weight: "400",
  display: "swap",
});

export function AlefGlyph() {
  return (
    <span lang="he" aria-hidden="true" className={`alefbet-glyph ${heebo.className}`}>
      א
    </span>
  );
}
