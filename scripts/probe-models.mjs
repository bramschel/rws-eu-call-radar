// scripts/probe-models.mjs — diagnoseert de AI-providerketen.
//
// Wat het doet:
//   1. toont welke sleutels/env-variabelen beschikbaar zijn;
//   2. haalt de models-lijsten op (Mistral, Gemini, OpenRouter);
//   3. stuurt per geconfigureerd model een minieme completion (korte timeout);
//   4. print per combinatie PASS/FAIL met HTTP-status en bericht;
//   5. stelt een werkende GEMINI_MODEL_1..n-reeks voor.
//
// Gebruik:
//   node scripts/probe-models.mjs            # env uit shell + .env/.env.local
//   node scripts/probe-models.mjs --verbose  # ook response-fragmenten tonen
//
// Exit-code 1 als geen enkele provider een completion kan maken.

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  MISTRAL_CHAT_URL,
  GEMINI_BASE_URL,
  OPENROUTER_CHAT_URL,
  OPENROUTER_MODELS_URL,
  getMistralModels,
  getGeminiModels,
  getOpenRouterModel,
  listMistralModels,
  listGeminiModels,
  listOpenRouterModels
} from '../lib/llm.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERBOSE = process.argv.includes('--verbose');
const PROBE_TIMEOUT_MS = 20000;
const PROBE_DELAY_MS = 300;
const TINY_PROMPT = 'Geef uitsluitend geldige JSON terug, zonder tekst daaromheen: {"ok":true}';

// ── Lokale env-loader (overschrijft bestaande env niet) ─────
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (key in process.env) continue;
    const value = rawValue.replace(/^["']|["']$/g, '');
    if (value) process.env[key] = value;
  }
}
loadEnvFile(join(__dirname, '../.env'));
loadEnvFile(join(__dirname, '../.env.local'));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function probe(url, { headers = {}, body }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    const message =
      data?.error?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      data?.message ||
      (response.ok ? 'ok' : `HTTP ${response.status}`);
    return {
      ok: response.ok,
      status: response.status,
      message,
      durationMs: Date.now() - startedAt,
      raw: JSON.stringify(data).slice(0, 400)
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      message: err.name === 'AbortError' ? `timeout na ${PROBE_TIMEOUT_MS / 1000}s` : err.message,
      durationMs: Date.now() - startedAt,
      raw: ''
    };
  } finally {
    clearTimeout(timer);
  }
}

function printResult(label, result) {
  const status = result.ok ? 'PASS' : 'FAIL';
  const code = result.status ?? 'net';
  console.log(`  [${status}] ${label} — ${code} — ${result.durationMs}ms — ${result.message}`);
  if (VERBOSE && result.raw) console.log(`         ${result.raw}`);
}

async function listWithFallback(name, fn) {
  try {
    const ids = await fn();
    console.log(`\n${name}: ${ids.length} modellen beschikbaar`);
    return ids;
  } catch (err) {
    console.log(`\n${name}: lijst ophalen mislukt (${err.message}) — doorgaan met individuele probes`);
    return null;
  }
}

function hasAny(envKey) {
  return !!process.env[envKey];
}

async function main() {
  console.log('── AI-provider probe ─────────────────────────────────────');

  const keys = {
    'VIBE_CLI_KEY_BCG (Mistral)': hasAny('VIBE_CLI_KEY_BCG'),
    'GEMINI_API_KEY': hasAny('GEMINI_API_KEY'),
    'OPENROUTER_API_KEY (optioneel)': hasAny('OPENROUTER_API_KEY'),
    'SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY (AI-cache)': hasAny('SUPABASE_URL') && hasAny('SUPABASE_PUBLISHABLE_KEY')
  };
  for (const [name, present] of Object.entries(keys)) {
    console.log(`  ${present ? '✓' : '✗'} ${name}`);
  }

  let anySuccess = false;
  const passingGeminiModels = [];

  // ── Mistral ──
  if (hasAny('VIBE_CLI_KEY_BCG')) {
    await listWithFallback('Mistral', listMistralModels);
    const mistralKey = process.env.VIBE_CLI_KEY_BCG;
    for (const model of getMistralModels()) {
      const result = await probe(MISTRAL_CHAT_URL, {
        headers: { Authorization: `Bearer ${mistralKey}` },
        body: {
          model,
          temperature: 0,
          max_tokens: 20,
          messages: [{ role: 'user', content: TINY_PROMPT }]
        }
      });
      printResult(`mistral chat ${model}`, result);
      anySuccess = anySuccess || result.ok;
      await sleep(PROBE_DELAY_MS);
    }
  } else {
    console.log('\nMistral: overgeslagen (VIBE_CLI_KEY_BCG ontbreekt)');
  }

  // ── Gemini: beide transporten ──
  if (hasAny('GEMINI_API_KEY')) {
    const available = await listWithFallback('Gemini', listGeminiModels);
    const geminiKey = process.env.GEMINI_API_KEY;
    const revision = process.env.GEMINI_API_REVISION ?? '2026-05-20';

    if (available && available.length) {
      const missing = getGeminiModels().filter((m) => !available.includes(m));
      if (missing.length) {
        console.log(`  ⚠ geconfigureerde modellen NIET in models-lijst: ${missing.join(', ')}`);
      }
    }

    for (const model of getGeminiModels()) {
      const inList = available ? available.includes(model) : null;
      const suffix = inList === null ? '' : inList ? ' [in lijst]' : ' [NIET in lijst]';

      // Transport 1: Interactions API
      const interactionsHeaders = { 'x-goog-api-key': geminiKey };
      if (revision) interactionsHeaders['Api-Revision'] = revision;
      const interactions = await probe(`${GEMINI_BASE_URL}/interactions`, {
        headers: interactionsHeaders,
        body: {
          model,
          system_instruction: 'Geef uitsluitend geldige JSON terug.',
          input: TINY_PROMPT,
          generation_config: { temperature: 0, max_output_tokens: 32 }
        }
      });
      printResult(`gemini interactions ${model}${suffix}`, interactions);
      anySuccess = anySuccess || interactions.ok;
      if (interactions.ok) passingGeminiModels.push({ model, transport: 'interactions' });
      await sleep(PROBE_DELAY_MS);

      // Transport 2: legacy generateContent
      const generate = await probe(`${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`, {
        headers: { 'x-goog-api-key': geminiKey },
        body: {
          contents: [{ role: 'user', parts: [{ text: TINY_PROMPT }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 32 }
        }
      });
      printResult(`gemini generateContent ${model}${suffix}`, generate);
      anySuccess = anySuccess || generate.ok;
      if (generate.ok && !passingGeminiModels.some((p) => p.model === model)) {
        passingGeminiModels.push({ model, transport: 'generateContent' });
      }
      await sleep(PROBE_DELAY_MS);
    }
  } else {
    console.log('\nGemini: overgeslagen (GEMINI_API_KEY ontbreekt)');
  }

  // ── OpenRouter (optionele derde fallback) ──
  if (hasAny('OPENROUTER_API_KEY')) {
    const list = await (async () => {
      try {
        const ids = await listOpenRouterModels();
        console.log(`\nOpenRouter: ${ids.length} modellen beschikbaar`);
        return ids;
      } catch (err) {
        console.log(`\nOpenRouter: lijst ophalen mislukt (${err.message})`);
        return null;
      }
    })();

    const model = getOpenRouterModel();
    if (list && !list.includes(model)) console.log(`  ⚠ ${model} staat niet in de models-lijst`);

    const result = await probe(OPENROUTER_CHAT_URL, {
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
      body: { model, temperature: 0, max_tokens: 20, messages: [{ role: 'user', content: TINY_PROMPT }] }
    });
    printResult(`openrouter chat ${model}`, result);
    anySuccess = anySuccess || result.ok;
  } else if (!hasAny('OPENROUTER_API_KEY')) {
    console.log('\nOpenRouter: niet geconfigureerd (optionele derde fallback)');
  }

  // ── Advies ──
  console.log('\n── Advies ────────────────────────────────────────────────');
  if (passingGeminiModels.length) {
    console.log('Werkende Gemini-modellen (zet als GEMINI_MODEL_1..n in Vercel):');
    passingGeminiModels.forEach((p, i) => console.log(`  GEMINI_MODEL_${i + 1}=${p.model}   (via ${p.transport})`));
  } else if (hasAny('GEMINI_API_KEY')) {
    console.log('⚠ Geen enkel geconfigureerd Gemini-model werkte. Controleer of de');
    console.log('  Interactions API bestaat voor jouw sleutel/regio, of stel GEMINI_MODEL_1..n in');
    console.log('  op modellen uit de models-lijst hierboven.');
  }

  if (!anySuccess) {
    console.log('\n❌ Geen enkele provider kon een completion maken. Controleer sleutels/model-IDs.');
    process.exit(1);
  }
  console.log('\n✓ Minstens één provider werkt.');
}

main().catch((err) => {
  console.error('Probe mislukt:', err);
  process.exit(1);
});
