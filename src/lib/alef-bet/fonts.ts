import { Gveret_Levin } from "next/font/google";

// The handwriting (script) font for the Script panel on letter cards. It is self-hosted by next/font and
// only loads on the trainer's card screens. A Hebrew speaker still needs to confirm it is the right hand
// (the alternative is Playpen Sans Hebrew); do not switch without asking.
export const scriptFont = Gveret_Levin({
  subsets: ["hebrew"],
  weight: "400",
  display: "swap",
});
