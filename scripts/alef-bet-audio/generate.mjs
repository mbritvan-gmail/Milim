// Makes the Alef-bet sound clips with Microsoft Azure's Hebrew voices (Hila, female, and Avri, male) and
// saves them as ordinary files in public/audio/alef-bet/<voice>/. This is NOT part of the app: run it by
// hand (and again only to redo clips).
//
//   AZURE_SPEECH_KEY=... AZURE_SPEECH_REGION=eastus \
//     node --experimental-strip-types scripts/alef-bet-audio/generate.mjs [options]
//
// Options
//   --dry-run           list what would be made and the number of characters; contacts nothing
//   --redo              remake clips that already exist (otherwise existing files are kept)
//   --only id,id        make just these clips (ids as in the manifest, e.g. bet-sound-1)
//   --voices hila,avri  which voices (default both)
//
// Clips marked with a carrier word need ffmpeg on this computer. The key is read from the environment and is never written anywhere. After a run it writes:
//   src/lib/alef-bet/audio-manifest.json   which clips exist per voice (the app reads this)
//   docs/alef-bet-audio.md                 provider, voices and date (kept for the licence record)

import { mkdir, readFile, writeFile, access, mkdtemp, rm } from "node:fs/promises";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { allClips } from "../../src/lib/alef-bet/letters.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outRoot = path.join(root, "public/audio/alef-bet");
const manifestPath = path.join(root, "src/lib/alef-bet/audio-manifest.json");

const VOICE_NAMES = { hila: "he-IL-HilaNeural", avri: "he-IL-AvriNeural" };

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => (args.includes(name) && args[args.indexOf(name) + 1] ? args[args.indexOf(name) + 1] : fallback);

const voices = option("--voices", "hila,avri").split(",").map((v) => v.trim().toLowerCase());
for (const v of voices) {
  if (!VOICE_NAMES[v]) {
    console.error(`Unknown voice "${v}". Use hila and/or avri.`);
    process.exit(1);
  }
}
const dryRun = flag("--dry-run");
const redo = flag("--redo");
const only = option("--only", "") ? option("--only", "").split(",") : null;

const everyClip = allClips();
const clips = only ? everyClip.filter((c) => only.includes(c.id)) : everyClip;
const chars = clips.reduce((n, c) => n + [...c.text].length, 0) * voices.length;
console.log(`${clips.length} of ${everyClip.length} clips x ${voices.length} voice(s) = ${clips.length * voices.length} files, ${chars} characters`);
if (only && clips.length !== only.length) console.log("Unknown ids ignored:", only.filter((id) => !everyClip.some((c) => c.id === id)).join(", "));

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

// Only a few clips need more than their plain Hebrew text (see allClips): a pronunciation hint in standard phonetic
// symbols (clip.ipa), or a carrier word said first and cut off afterwards (clip.carrier, needs ffmpeg).
async function speak(voiceName, clip) {
  const body = clip.ipa ? `<phoneme alphabet="ipa" ph="${escapeXml(clip.ipa)}">${escapeXml(clip.text)}</phoneme>` : escapeXml(clip.text);
  const inner = clip.carrier ? `${escapeXml(clip.carrier)}<break time="600ms"/>${body}` : body;
  const ssml = `<speak version="1.0" xml:lang="he-IL"><voice name="${voiceName}"><prosody rate="-15%">${inner}</prosody></voice></speak>`;
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
  const audio = Buffer.from(await res.arrayBuffer());
  return clip.carrier ? cutOffCarrier(audio) : audio;
}

// Keep what comes after the pause that follows the carrier word, and trim silence from the end.
async function cutOffCarrier(audio) {
  const dir = await mkdtemp(path.join(tmpdir(), "alef-"));
  try {
    const input = path.join(dir, "in.mp3");
    const output = path.join(dir, "out.mp3");
    await writeFile(input, audio);
    const probe = spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-af", "silencedetect=noise=-32dB:d=0.06", "-f", "null", "-"], { encoding: "utf8" });
    const starts = [...probe.stderr.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
    const ends = [...probe.stderr.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
    const gap = starts.findIndex((start, i) => start > 0.2 && ends[i] !== undefined);
    if (gap === -1) throw new Error("could not find the pause after the carrier word");
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(Math.max(0, ends[gap] - 0.03)), "-i", input, "-af", "silenceremove=stop_periods=-1:stop_duration=0.3:stop_threshold=-40dB", "-c:a", "libmp3lame", "-b:a", "48k", output]);
    return await readFile(output);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {}
// Forget clips that are no longer part of the list (for example after ids change).
const knownIds = new Set(everyClip.map((c) => c.id));
for (const voice of Object.keys(manifest)) for (const id of Object.keys(manifest[voice])) if (!knownIds.has(id)) delete manifest[voice][id];

let made = 0;
let failed = 0;
outer: for (const voice of voices) {
  await mkdir(path.join(outRoot, voice), { recursive: true });
  manifest[voice] ??= {};
  for (const clip of clips) {
    const file = `${clip.id}.mp3`;
    const target = path.join(outRoot, voice, file);
    if (!redo && (await exists(target))) {
      manifest[voice][clip.id] = file;
      continue;
    }
    try {
      // The free tier now and then answers "429 slow down": wait a little and try again.
      let audio;
      for (let attempt = 1; ; attempt++) {
        try {
          audio = await speak(VOICE_NAMES[voice], clip);
          break;
        } catch (error) {
          if (!/ 429/.test(error.message) || attempt >= 5) throw error;
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        }
      }
      await writeFile(target, audio);
      manifest[voice][clip.id] = file;
      made++;
      process.stdout.write(".");
    } catch (error) {
      failed++;
      console.error(`\n${voice}/${clip.id}: ${error.message}`);
      if (/ 401| 403| 404/.test(error.message)) break outer; // the key or region is wrong: stop instead of failing 174 times
    }
  }
}
console.log(`\nMade ${made} new clips, ${failed} failed.`);
if (made === 0 && failed > 0) {
  console.error("Nothing was made, so nothing was written.");
  process.exit(1);
}

const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort());
const sorted = Object.fromEntries(Object.entries(manifest).sort().map(([v, m]) => [v, sortKeys(m)]));
await writeFile(manifestPath, JSON.stringify(sorted, null, 1) + "\n");

await writeFile(
  path.join(root, "docs/alef-bet-audio.md"),
  `# Alef-bet sound clips\n\n- Provider: Microsoft Azure AI Speech (text to speech), region ${region}\n- Voices: he-IL-HilaNeural (female, folder hila) and he-IL-AvriNeural (male, folder avri)\n- Generated: ${new Date().toISOString().slice(0, 10)}\n- Clips: ${Object.entries(sorted).map(([v, m]) => `${v} ${Object.keys(m).length}`).join(", ")} of ${everyClip.length} each\n- Script: scripts/alef-bet-audio/generate.mjs (slowed 15% for learners)\n\nStatus: the owner listened to samples in both voices and approved them. **Not yet reviewed clip by clip by a Hebrew speaker**: listen to every clip and remove or redo wrong ones (\`--only id --redo\`) before wide release. Check Azure's terms on using generated audio inside a published app before wide release.\n`,
);
console.log("Wrote the manifest and docs/alef-bet-audio.md.");
