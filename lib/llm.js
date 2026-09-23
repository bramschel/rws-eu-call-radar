// lib/llm.js — LLM-provider adapters, retry/backoff en fallback-keten.
// Gebruikt door api/score.js (Vercel serverless) en scripts/probe-models.mjs (lokale diagnose).
//
// Keten (in volgorde): Mistral primair → Mistral fallback-model → Gemini-modellen
// (per model: Interactions API, daarna legacy generateContent) → OpenRouter free model.
// Elke stap krijgt maximaal MAX_ATTEMPTS_PER_STEP pogingen bij tijdelijke fouten
// (429/500/502/503/504/timeouts/netwerk). De hele keten stopt zodra de deadline
// overschreden is, zodat /api/score ruim binnen Vercel's maxDuration blijft.

export const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';
export const MISTRAL_MODELS_URL = 'https://api.mistral.ai/v1/models';
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

const SYSTEM_PROMPT =
  'Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel. Geef uitsluitend geldige JSON terug, zonder markdown-codeblokken.';

export const MAX_ATTEMPTS_PER_STEP = 2;
export const DEFAULT_CHAIN_DEADLINE_MS = 120000;

const TIMEOUTS = {
  mistral: 20000,
  geminiInteractions: 25000,
  geminiGenerateContent: 25000,
  openrouter: 30000
};

const TRANSIENT_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const TRANSIENT_CODES = new Set([
  'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED',
  'EPIPE', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT'
]);

// ── Foutclassificatie ───────────────────────────────────────

// Tijdelijke fout: zinvol om te retryen én om naar de volgende provider te gaan.
export function isTransientError(err) {
  if (!err) return false;
  // Config-/sleutelfouten zijn nooit transient, ook al dragen ze een 5xx-status.
  if (err.configError) return false;
  if (err.status && TRANSIENT_STATUSES.has(err.status)) return true;
  if (err.code && TRANSIENT_CODES.has(err.code)) return true;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;

  const msg = String(err.message || '').toLowerCase();
  if (
    msg.includes('high demand') ||
    msg.includes('currently experiencing high demand') ||
    msg.includes('overloaded') ||
    msg.includes('try again later') ||
    msg.includes('timeout') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('fetch failed')
  ) {
    return true;
  }
  return false;
}

function configError(message) {
  const err = new Error(message);
  err.configError = true;
  return err;
}

async function httpError(provider, response) {
  const body = await response.json().catch(() => ({}));
  const message =
    body?.error?.message ||
    (typeof body?.error === 'string' ? body.error : null) ||
    body?.message ||
    `${provider}-fout ${response.status}`;
  const err = new Error(message);
  err.status = response.status;
  err.details = body;
  return err;
}

function emptyResponseError(provider) {
  const err = new Error(`${provider} gaf een leeg antwoord terug`);
  err.status = 502;
  return err;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithTimeout(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutError = new Error(`Provider reageerde niet binnen ${Math.round(timeoutMs / 1000)}s (timeout)`);
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ── Modelconfiguratie ───────────────────────────────────────

export function getMistralModels() {
  const primary = process.env.AI_MODEL || process.env.MISTRAL_MODEL || 'mistral-small-latest';
  const fallback = process.env.AI_FALLBACK_MODEL || 'open-mistral-nemo';
  return primary === fallback ? [primary] : [primary, fallback];
}

// Standaard keten is bewust kort: 3 flash-modellen met de hoogste gratis quota.
// Alle GEMINI_MODEL_n-variabelen blijven leidend als ze gezet zijn.
export function getGeminiModels() {
  const fromEnv = [
    process.env.GEMINI_MODEL_1,
    process.env.GEMINI_MODEL_2,
    process.env.GEMINI_MODEL_3,
    process.env.GEMINI_MODEL_4,
    process.env.GEMINI_MODEL_5,
    process.env.GEMINI_MODEL_6
  ].filter(Boolean);
  if (fromEnv.length) return [...new Set(fromEnv)];
  return ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash'];
}

export function getOpenRouterModel() {
  return process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
}

export function getChainConfig() {
  return {
    mistralModels: process.env.VIBE_CLI_KEY_BCG ? getMistralModels() : [],
    mistralConfigured: !!process.env.VIBE_CLI_KEY_BCG,
    geminiModels: process.env.GEMINI_API_KEY ? getGeminiModels() : [],
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    geminiRevision: process.env.GEMINI_API_REVISION ?? '2026-05-20',
    openrouterConfigured: !!process.env.OPENROUTER_API_KEY,
    openrouterModel: process.env.OPENROUTER_API_KEY ? getOpenRouterModel() : null
  };
}

// ── Response-schema (structured output) ─────────────────────

export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    reviews: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          identifier: { type: 'STRING' },
          aiRelevanceScore: { type: 'NUMBER' },
          projectFit: { type: 'STRING' },
          projectFitScore: { type: 'NUMBER' },
          themeFit: { type: 'ARRAY', items: { type: 'STRING' } },
          rationale: { type: 'STRING' },
          possibleRwsRole: { type: 'STRING' },
          possibleRwsProject: { type: 'STRING' },
          callScopeSummary: { type: 'STRING' },
          uncertainties: { type: 'STRING' },
          callRequirements: { type: 'ARRAY', items: { type: 'STRING' } },
          ragMatchedItems: { type: 'ARRAY', items: { type: 'STRING' } },
          snapshotReden: { type: 'STRING' },
          waaromRelevant: { type: 'ARRAY', items: { type: 'STRING' } }
        },
        required: [
          'identifier', 'aiRelevanceScore', 'projectFit', 'rationale',
          'possibleRwsRole', 'uncertainties', 'callRequirements', 'ragMatchedItems'
        ]
      }
    },
    summary: {
      type: 'OBJECT',
      properties: {
        executiveSummary: { type: 'STRING' },
        overallAdvice: { type: 'STRING' },
        topOpportunities: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              identifier: { type: 'STRING' },
              title: { type: 'STRING' },
              score: { type: 'NUMBER' },
              rationale: { type: 'STRING' }
            }
          }
        },
        notableExclusions: { type: 'STRING' },
        recommendedNextSteps: { type: 'ARRAY', items: { type: 'STRING' } }
      }
    }
  },
  required: ['reviews']
};

// ── Provider-adapters ───────────────────────────────────────
// Elke adapter heeft dezelfde contract: (prompt, { model, timeoutMs }) → { rawText, provider, model }

export async function callMistral(prompt, { model, timeoutMs = TIMEOUTS.mistral } = {}) {
  const apiKey = process.env.VIBE_CLI_KEY_BCG;
  if (!apiKey) throw configError('VIBE_CLI_KEY_BCG environment variable is required');

  const response = await fetchWithTimeout(MISTRAL_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      max_tokens: 8192,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    })
  }, timeoutMs);

  if (!response.ok) throw await httpError('mistral', response);

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw emptyResponseError('mistral');

  return { rawText, provider: 'mistral', model };
}

// Nieuwere Interactions API (POST /v1beta/interactions).
// Api-Revision is env-stuurbaar zodat een gewijzigde revisie niet de hele
// fallbackketen hoeft te breken: zet GEMINI_API_REVISION leeg om de header te laten vallen.
export async function callGeminiInteractions(prompt, { model, timeoutMs = TIMEOUTS.geminiInteractions } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw configError('GEMINI_API_KEY environment variable is required');

  const headers = {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  };
  const revision = process.env.GEMINI_API_REVISION ?? '2026-05-20';
  if (revision) headers['Api-Revision'] = revision;

  const response = await fetchWithTimeout(`${GEMINI_BASE_URL}/interactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      system_instruction: SYSTEM_PROMPT,
      input: prompt,
      // /interactions accepteert geen json_schema; alleen het basistype.
      // Het JSON-contract blijft via de prompt (en extractJsonFromText) afgedwongen.
      response_format: {
        type: 'object'
      },
      generation_config: {
        temperature: 0.2,
        max_output_tokens: 16384
      }
    })
  }, timeoutMs);

  if (!response.ok) throw await httpError('gemini', response);

  const data = await response.json();

  // Interactions-schema: steps-array met model_output-stappen.
  const modelOutputStep = data.steps?.find((step) => step.type === 'model_output');
  const textContent = modelOutputStep?.content?.find((c) => c.type === 'text');
  // Net als bij generateContent kan de tekst ook als candidates terugkomen.
  const legacyText = extractGenerateContentText(data);
  const rawText = textContent?.text || legacyText;
  if (!rawText) throw emptyResponseError('gemini interactions');

  return { rawText, provider: 'gemini', model };
}

// Klassieke generateContent-API — dient als transport-fallback wanneer de
// Interactions API niet beschikbaar of niet compatible blijkt.
export async function callGeminiGenerateContent(prompt, { model, timeoutMs = TIMEOUTS.geminiGenerateContent } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw configError('GEMINI_API_KEY environment variable is required');

  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16384,
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA
      }
    })
  }, timeoutMs);

  if (!response.ok) throw await httpError('gemini', response);

  const data = await response.json();
  const rawText = extractGenerateContentText(data);
  if (!rawText) {
    const blockReason = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    const err = new Error(blockReason ? `generateContent gaf geen tekst terug (${blockReason})` : 'generateContent gaf een leeg antwoord terug');
    err.status = 502;
    throw err;
  }

  return { rawText, provider: 'gemini', model };
}

function extractGenerateContentText(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => (typeof p?.text === 'string' ? p.text : '')).join('').trim();
}

// Derde, gratis fallback: OpenRouter free-tier model (OpenAI-compatibel).
// Geen response_format: veel free models ondersteunen dat niet; de prompt
// eist al geldige JSON en extractJsonFromText vangt markdown-fences op.
export async function callOpenRouter(prompt, { model, timeoutMs = TIMEOUTS.openrouter } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw configError('OPENROUTER_API_KEY environment variable is required');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'X-Title': 'RWS EU Call Radar'
  };
  if (process.env.OPENROUTER_SITE_URL) headers['HTTP-Referer'] = process.env.OPENROUTER_SITE_URL;

  const response = await fetchWithTimeout(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 8192,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ]
    })
  }, timeoutMs);

  if (!response.ok) throw await httpError('openrouter', response);

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) throw emptyResponseError('openrouter');

  return { rawText, provider: 'openrouter', model };
}

// ── Modelbeschikbaarheid (best-effort) ──────────────────────

const geminiAvailability = { at: 0, names: null, ttlMs: 15 * 60 * 1000 };
const rejectedGeminiModels = new Map();      // model → reden (alleen voor deze warm instance)
const rejectedGeminiTransports = new Set();  // 'interactions' | 'generateContent'

export async function getGeminiAvailability() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const now = Date.now();
  if (geminiAvailability.names && now - geminiAvailability.at < geminiAvailability.ttlMs) {
    return geminiAvailability.names;
  }

  try {
    const response = await fetchWithTimeout(
      `${GEMINI_BASE_URL}/models?pageSize=200`,
      { headers: { 'x-goog-api-key': apiKey } },
      5000
    );
    if (!response.ok) throw new Error(`models-lijst gaf ${response.status}`);
    const data = await response.json();
    const names = new Set(
      (data.models || [])
        .map((m) => String(m.name || '').replace(/^models\//, ''))
        .filter(Boolean)
    );
    if (names.size) {
      geminiAvailability.names = names;
      geminiAvailability.at = now;
    }
    return geminiAvailability.names;
  } catch (err) {
    // Cache fallback: eerdere lijst (of null) blijft gelden.
    console.warn('Gemini models-lijst ophalen mislukt:', err.message);
    return geminiAvailability.names;
  }
}

async function listModelIds(url, { headers = {}, path = 'models' } = {}) {
  const response = await fetchWithTimeout(url, { headers }, 8000);
  if (!response.ok) throw await httpError('models', response);
  const data = await response.json();
  return (data[path] || []).map((m) => m.id || m.name || '').filter(Boolean);
}

export function listMistralModels() {
  const apiKey = process.env.VIBE_CLI_KEY_BCG;
  if (!apiKey) throw configError('VIBE_CLI_KEY_BCG environment variable is required');
  return listModelIds(MISTRAL_MODELS_URL, { headers: { Authorization: `Bearer ${apiKey}` }, path: 'data' });
}

export async function listGeminiModels() {
  const availability = await getGeminiAvailability();
  if (!availability) throw new Error('Gemini models-lijst niet beschikbaar');
  return [...availability];
}

export function listOpenRouterModels() {
  return listModelIds(OPENROUTER_MODELS_URL, { path: 'data' });
}

// ── Fallback-keten ──────────────────────────────────────────

function geminiStep(model, transport) {
  const call = transport === 'interactions' ? callGeminiInteractions : callGeminiGenerateContent;
  return {
    provider: 'gemini',
    model,
    transport,
    timeoutMs: transport === 'interactions' ? TIMEOUTS.geminiInteractions : TIMEOUTS.geminiGenerateContent,
    call: (prompt, timeoutMs) => call(prompt, { model, timeoutMs })
  };
}

export async function buildChain() {
  const steps = [];

  if (process.env.VIBE_CLI_KEY_BCG) {
    const [primary, fallback] = getMistralModels();
    const mistralSteps = [{ provider: 'mistral', model: primary, transport: 'chat', timeoutMs: TIMEOUTS.mistral, call: (p, t) => callMistral(p, { model: primary, timeoutMs: t }) }];
    if (fallback && fallback !== primary) {
      mistralSteps.push({ provider: 'mistral', model: fallback, transport: 'chat', timeoutMs: TIMEOUTS.mistral, call: (p, t) => callMistral(p, { model: fallback, timeoutMs: t }) });
    }
    steps.push(...mistralSteps);
  }

  if (process.env.GEMINI_API_KEY) {
    const availability = await getGeminiAvailability();
    let models = getGeminiModels().filter((m) => !rejectedGeminiModels.has(m));

    // Filter op de models-lijst, maar alleen als daardoor niet alles wegvalt
    // (bescherming tegen naamconventie-verschillen tussen lijst en configuratie).
    if (availability && availability.size) {
      const known = models.filter((m) => availability.has(m));
      if (known.length > 0) {
        const dropped = models.filter((m) => !availability.has(m));
        if (dropped.length) console.warn('Gemini-modellen overgeslagen (niet in models-lijst):', dropped);
        models = known;
      }
    }

    for (const model of models) {
      if (!rejectedGeminiTransports.has('interactions')) steps.push(geminiStep(model, 'interactions'));
      if (!rejectedGeminiTransports.has('generateContent')) steps.push(geminiStep(model, 'generateContent'));
    }
  }

  if (process.env.OPENROUTER_API_KEY) {
    const model = getOpenRouterModel();
    steps.push({
      provider: 'openrouter',
      model,
      transport: 'chat',
      timeoutMs: TIMEOUTS.openrouter,
      call: (p, t) => callOpenRouter(p, { model, timeoutMs: t })
    });
  }

  return steps;
}

function isUnknownModelError(err) {
  // Alleen een 404 die expliciet over een model gaat (bijv.
  // "models/x is not found") mag een model afserveren. Een 404 zonder
  // model-naam duidt op een ontbrekend endpoint en wordt transport-gebonden.
  return err?.status === 404 && /models?\//i.test(String(err?.message || ''));
}

function isUnknownEndpointError(err) {
  return err?.status === 404 && !/models?\//i.test(String(err?.message || ''));
}

function buildCompositeError(attempts, lastError) {
  const summary = attempts
    .map((a) => `${a.provider}/${a.model}${a.transport && a.transport !== 'chat' ? ` (${a.transport})` : ''}: ${a.ok ? 'ok' : (a.status || 'net')}`)
    .join('; ');

  const allTransient = attempts.length > 0 && attempts.every((a) => a.transient);

  const err = new Error(attempts.length
    ? `Alle AI-providers mislukt — ${summary}`
    : (lastError?.message || 'Geen AI-provider beschikbaar'));
  err.attempts = attempts;
  err.transient = allTransient;
  err.status = allTransient ? 503 : (lastError?.status || 500);
  return err;
}

/**
 * Draait de volledige fallback-keten over de gegeven prompt.
 * Retourneert { rawText, provider, model, attempts } of gooit een samengestelde fout
 * met error.attempts (array van { provider, model, transport, attempt, ok, status, transient, durationMs, message }).
 */
export async function runLlmChain(prompt, { deadlineMs = DEFAULT_CHAIN_DEADLINE_MS, onAttempt } = {}) {
  const deadlineAt = Date.now() + deadlineMs;
  const steps = await buildChain();
  const attempts = [];

  if (!steps.length) {
    const err = configError('Geen LLM-provider geconfigureerd: mist VIBE_CLI_KEY_BCG, GEMINI_API_KEY en/of OPENROUTER_API_KEY.');
    err.status = 500;
    err.attempts = [];
    throw err;
  }

  let lastError = null;

  for (const step of steps) {
    if (Date.now() >= deadlineAt) {
      console.warn('LLM-keten afgebroken door deadline; resterende stappen overgeslagen.');
      break;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_STEP; attempt++) {
      if (Date.now() >= deadlineAt) break;

      const remainingMs = deadlineAt - Date.now();
      const startedAt = Date.now();

      try {
        const result = await step.call(prompt, Math.min(step.timeoutMs, remainingMs));
        const record = {
          provider: step.provider,
          model: step.model,
          transport: step.transport,
          attempt,
          ok: true,
          status: 200,
          transient: false,
          durationMs: Date.now() - startedAt,
          message: 'ok'
        };
        attempts.push(record);
        onAttempt?.(record);
        return { ...result, attempts };
      } catch (err) {
        const transient = isTransientError(err);
        const record = {
          provider: step.provider,
          model: step.model,
          transport: step.transport,
          attempt,
          ok: false,
          status: err.status ?? null,
          transient,
          durationMs: Date.now() - startedAt,
          message: err.message
        };
        attempts.push(record);
        onAttempt?.(record);
        lastError = err;

        // Onbekend model: niet nog eens proberen tijdens deze warm instance.
        if (step.provider === 'gemini' && isUnknownModelError(err)) {
          rejectedGeminiModels.set(step.model, err.message);
          console.warn(`Gemini-model ${step.model} lijkt niet te bestaan en wordt overgeslagen:`, err.message);
        }
        // Ontbrekend endpoint (bijv. /interactions bestaat niet): alleen dit
        // transport laten vallen, het andere blijft beschikbaar.
        if (step.provider === 'gemini' && isUnknownEndpointError(err)) {
          rejectedGeminiTransports.add(step.transport);
          console.warn(`Gemini-transport ${step.transport} lijkt niet te bestaan en wordt overgeslagen:`, err.message);
        }

        if (!transient) break; // config-/requestfout: zelfde stap niet herhalen

        const backoffMs = Math.min(400 * (2 ** (attempt - 1)) + Math.random() * 300, 3000);
        if (attempt < MAX_ATTEMPTS_PER_STEP && Date.now() + backoffMs < deadlineAt) {
          await sleep(backoffMs);
        } else {
          break;
        }
      }
    }
  }

  throw buildCompositeError(attempts, lastError);
}
