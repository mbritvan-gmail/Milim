// Makes the Alef-bet sound clips with a text-to-speech service and saves them as ordinary files in
// public/audio/alef-bet/. This is NOT part of the app: run it by hand (and again only to redo clips).
//
//   OPENAI_API_KEY=... node --experimental-strip-types scripts/alef-bet-audio/generate.mjs [options]
//
// Options
//   --sample            make only a few clips, to judge the voice first
//   --dry-run           list what would be made and the number of characters; contacts nothing
//   --redo              remake clips that already exist (otherwise existing files are kept)
//   --only id,id        make just these clips (ids as in the manifest, e.g. bet-sound-1)
//   --voice NAME        OpenAI voice (default coral)
//   --model NAME        OpenAI model (default gpt-4o-mini-tts; tts-1-hd also works, without the spoken instructions)
//   --provider azure    use Microsoft Azure's Hebrew voices instead (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION; --voice Hila|Avri)
//
// The key is read from the environment and is never written anywhere. After a run it writes:
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
const option = (name, fallback) => (args.includes(name) && args[args.indexOf(name) + 1] ? args[args.indexOf(name) + 1] : fallback);

const provider = option("--provider", "openai");
if (!["openai", "azure"].includes(provider)) {
  console.error('--provider must be "openai" or "azure"');
  process.exit(1);
}
const voice = provider === "azure" ? `he-IL-${option("--voice", "Hila").replace(/Neural$/, "")}Neural` : option("--voice", "coral");
const model = option("--model", "gpt-4o-mini-tts");
const dryRun = flag("--dry-run");
const redo = flag("--redo");

// A short, varied set to judge a voice by: a letter name, a sound with and without a dot, a silent letter,
// a throaty letter, a vowel and a word.
const SAMPLE = ["alef-name", "bet-name", "bet-sound-1", "bet-sound-2", "alef-sound-1", "khet-sound-1", "v-a-sound-1", "word-bayit"];
const only = option("--only", "") ? option("--only", "").split(",") : flag("--sample") ? SAMPLE : null;

const everyClip = allClips();
const clips = only ? everyClip.filter((c) => only.includes(c.id)) : everyClip;
const chars = clips.reduce((n, c) => n + [...c.text].length, 0);
console.log(`${clips.length} of ${everyClip.length} clips, ${chars} characters, ${provider} voice ${voice}${provider === "openai" ? `, model ${model}` : ""}`);
if (only && clips.length !== only.length) console.log("Unknown ids ignored:", only.filter((id) => !everyClip.some((c) => c.id === id)).join(", "));

const exists = (file) => access(file).then(() => true, () => false);

if (dryRun) {
  for (const c of clips) console.log(`${c.id.padEnd(18)} ${c.kind.padEnd(6)} ${c.text}`);
  console.log("Dry run: nothing was sent and nothing was written.");
  process.exit(0);
}

const escapeXml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// What to tell the voice, so a bare syllable like "ba" is said as a short syllable and not read as a word.
const instructionsFor = (clip) =>
  clip.kind === "word"
    ? "Say this one Hebrew word clearly and calmly, at a slow teaching pace. Say only the word."
    : clip.kind === "name"
      ? "Say the name of this Hebrew letter clearly, at a slow teaching pace, in modern Israeli Hebrew. Say only the name."
      : "This is a single short Hebrew syllable (a letter with a vowel), for a language learner. Say just that one short syllable, clearly and slowly, in modern Israeli Hebrew. Do not add any other word or sound.";

async function speakOpenAI(clip) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const body = { model, voice, input: clip.text, response_format: "mp3" };
  if (model.startsWith("gpt-4o")) body.instructions = instructionsFor(clip);
  else body.speed = 0.85;
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function speakAzure(clip) {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) throw new Error("AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are not set");
  const ssml = `<speak version="1.0" xml:lang="he-IL"><voice name="${voice}"><prosody rate="-15%">${escapeXml(clip.text)}</prosody></voice></speak>`;
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
const speak = provider === "azure" ? speakAzure : speakOpenAI;

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
    await writeFile(target, await speak(clip));
    manifest[clip.id] = file;
    made++;
    process.stdout.write(".");
  } catch (error) {
    failed++;
    console.error(`\n${clip.id}: ${error.message}`);
    if (/ 401| 403/.test(error.message)) break; // the key is wrong: stop instead of failing 87 times
  }
}
console.log(`\nMade ${made} new clips, ${failed} failed.`);
if (made === 0 && failed > 0) {
  console.error("Nothing was made, so nothing was written.");
  process.exit(1);
}

await writeFile(manifestPath, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 1) + "\n");

// A page to listen to every clip made so far, one row per clip.
const rows = everyClip
  .filter((c) => manifest[c.id])
  .map(
    (c) =>
      `<tr><td>${c.id}</td><td>${c.kind}</td><td lang="he" dir="rtl" style="font-size:28px">${escapeXml(c.text)}</td><td><audio controls preload="none" src="../../public/audio/alef-bet/${manifest[c.id]}"></audio></td><td><label><input type="checkbox"> wrong</label></td></tr>`,
  )
  .join("\n");
await writeFile(
  path.join(root, "scripts/alef-bet-audio/review.html"),
  `<!doctype html><meta charset="utf-8"><title>Alef-bet clips: review</title><style>body{font-family:system-ui;margin:24px}td{padding:6px 12px;border-bottom:1px solid #ddd}</style><h1>Listen to every clip</h1><p>Tick any that are wrong and send the list of ids. Voice: ${voice} (${provider}).</p><table>${rows}</table>`,
);

await writeFile(
  path.join(root, "docs/alef-bet-audio.md"),
  `# Alef-bet sound clips\n\n- Provider: ${provider === "azure" ? "Microsoft Azure AI Speech (text to speech)" : `OpenAI text to speech (model ${model})`}\n- Voice: ${voice}\n- Generated: ${new Date().toISOString().slice(0, 10)}\n- Clips: ${Object.keys(manifest).length} of ${everyClip.length}\n- Script: scripts/alef-bet-audio/generate.mjs\n\nStatus: **not yet reviewed by a Hebrew speaker.** Every clip must be listened to (scripts/alef-bet-audio/review.html) and wrong ones removed or redone before release. Check the provider's terms on using generated audio inside a published app (some require saying the voice is AI-generated) before wide release.\n`,
);
console.log("Wrote the manifest, review.html and docs/alef-bet-audio.md.");
