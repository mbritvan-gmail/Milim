// Makes the Alef-bet sound clips with Microsoft Azure's Hebrew voices and saves them as ordinary files in
// public/audio/alef-bet/. This is NOT part of the app: run it by hand, once (and again only to redo clips).
//
//   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=westeurope \
//     node --experimental-strip-types scripts/alef-bet-audio/generate.mjs [--voice Hila|Avri] [--dry-run] [--redo]
//
// The key is read from the environment and is never written anywhere. Clips that already exist are skipped
// unless you pass --redo. --dry-run lists what would be made and the number of characters (what Azure bills
// for) without contacting Azure.
//
// After a run it writes:
//   src/lib/alef-bet/audio-manifest.json   which clips exist (the app reads this)
//   scripts/alef-bet-audio/review.html     a page to listen to every clip (a Hebrew speaker must do this)
//   docs/alef-bet-audio.md                 provider, voice and date (kept for the licence record)

import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { allClips } from "../../src/lib/alef-bet/letters.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "public/audio/alef-bet");
const manifestPath = path.join(root, "src/lib/alef-bet/audio-manifest.json");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const voiceArg = args[args.indexOf("--voice") + 1];
const voice = `he-IL-${args.includes("--voice") && voiceArg ? voiceArg.replace(/Neural$/, "") : "Hila"}Neural`;
const dryRun = flag("--dry-run");
const redo = flag("--redo");

const clips = allClips();
const chars = clips.reduce((n, c) => n + [...c.text].length, 0);
console.log(`${clips.length} clips, ${chars} characters, voice ${voice}`);

const exists = (file) => access(file).then(() => true, () => false);

if (dryRun) {
  for (const c of clips) console.log(`${c.id.padEnd(18)} ${c.kind.padEnd(6)} ${c.text}`);
  console.log("Dry run: nothing was sent and nothing was written.");
  process.exit(0);
}

const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
if (!key || !region) {
  console.error("Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first (see the notes at the top of this file).");
  process.exit(1);
}

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function speak(text) {
  const ssml = `<speak version="1.0" xml:lang="he-IL"><voice name="${voice}"><prosody rate="-15%">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "alef-bet-audio",
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

await mkdir(outDir, { recursive: true });
let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {}

let made = 0;
let failed = 0;
for (const clip of clips) {
  const file = `${clip.id}.mp3`;
  const target = path.join(outDir, file);
  if (!redo && (await exists(target))) {
    manifest[clip.id] = file;
    continue;
  }
  try {
    await writeFile(target, await speak(clip.text));
    manifest[clip.id] = file;
    made++;
    process.stdout.write(".");
  } catch (error) {
    failed++;
    console.error(`\n${clip.id}: ${error.message}`);
  }
}
console.log(`\nMade ${made} new clips, ${failed} failed.`);

await writeFile(manifestPath, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 1) + "\n");

// A page to listen to every clip, one row per clip.
const rows = clips
  .filter((c) => manifest[c.id])
  .map(
    (c) =>
      `<tr><td>${c.id}</td><td>${c.kind}</td><td lang="he" dir="rtl" style="font-size:28px">${escapeXml(c.text)}</td><td><audio controls preload="none" src="../../public/audio/alef-bet/${manifest[c.id]}"></audio></td><td><label><input type="checkbox"> wrong</label></td></tr>`,
  )
  .join("\n");
await writeFile(
  path.join(root, "scripts/alef-bet-audio/review.html"),
  `<!doctype html><meta charset="utf-8"><title>Alef-bet clips: review</title><style>body{font-family:system-ui;margin:24px}td{padding:6px 12px;border-bottom:1px solid #ddd}</style><h1>Listen to every clip</h1><p>Tick any that are wrong and send the list of ids. Voice: ${voice}.</p><table>${rows}</table>`,
);

await writeFile(
  path.join(root, "docs/alef-bet-audio.md"),
  `# Alef-bet sound clips\n\n- Provider: Microsoft Azure AI Speech (text to speech)\n- Voice: ${voice}\n- Generated: ${new Date().toISOString().slice(0, 10)}\n- Clips: ${Object.keys(manifest).length} (${chars} characters of text)\n- Script: scripts/alef-bet-audio/generate.mjs\n\nStatus: **not yet reviewed by a Hebrew speaker.** Every clip must be listened to (scripts/alef-bet-audio/review.html) and wrong ones removed or redone before release. Check Azure's terms on using generated audio inside a published app before wide release.\n`,
);
console.log("Wrote the manifest, review.html and docs/alef-bet-audio.md.");
