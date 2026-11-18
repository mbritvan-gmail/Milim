import manifest from "./audio-manifest.json";

// Which sound clips exist. The generation script (scripts/alef-bet-audio) writes audio-manifest.json,
// mapping a clip id to its file under public/audio/alef-bet/. A clip that is not listed simply has no
// speaker button, so the trainer works before any audio is added, and a single rejected clip can be
// removed from the list without touching code.
export const CLIPS: Record<string, string> = manifest;

export const clipSrc = (id: string): string | null => (CLIPS[id] ? `/audio/alef-bet/${CLIPS[id]}` : null);

export { nameClipId, soundClipId, exampleClipId } from "./letters";
