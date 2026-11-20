import manifest from "./audio-manifest.json";

// Which sound clips exist, per voice. The generation script (scripts/alef-bet-audio) writes
// audio-manifest.json: for each voice, a clip id mapped to its file under public/audio/alef-bet/<voice>/.
// A clip that is not listed simply has no speaker button, so a single rejected clip can be removed from
// the list without touching code.
export type Voice = "female" | "male";
export const VOICES: Voice[] = ["female", "male"];

// female = Azure's Hila, male = Azure's Avri (folder names).
const FOLDER: Record<Voice, "hila" | "avri"> = { female: "hila", male: "avri" };
const CLIPS = manifest as Record<"hila" | "avri", Record<string, string>>;

export const clipSrc = (id: string, voice: Voice): string | null => {
  const folder = FOLDER[voice];
  const file = CLIPS[folder]?.[id];
  return file ? `/audio/alef-bet/${folder}/${file}` : null;
};

/** True if either voice has this clip, so the speaker button should show. */
export const hasClip = (id: string): boolean => VOICES.some((v) => clipSrc(id, v));

export { nameClipId, soundClipId, exampleClipId } from "./letters";
