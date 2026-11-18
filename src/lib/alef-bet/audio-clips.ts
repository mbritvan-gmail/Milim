import type { LetterCard } from "./letters";

// Which sound clips exist. Maps a clip id to its file under public/audio/alef-bet/. A clip that is not
// listed here simply has no speaker button, so the trainer works fine before any audio is added.
// Clip ids: "<card>-name", "<card>-sound-<n>" (n counts the card's sound rows from 1), "word-<translit>".
export const CLIPS: Record<string, string> = {};

export const clipSrc = (id: string): string | null => (CLIPS[id] ? `/audio/alef-bet/${CLIPS[id]}` : null);

export const nameClipId = (card: LetterCard) => `${card.id}-name`;
export const soundClipId = (card: LetterCard, index: number) => `${card.id}-sound-${index + 1}`;
export const exampleClipId = (card: LetterCard) => `word-${card.example.translit}`;
