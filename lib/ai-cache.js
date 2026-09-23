// lib/ai-cache.js — server-side cache voor AI-analyse-resultaten (Supabase).
//
// De sleutel is een hash van de VOLLEDige invoer (projectidee, keywords, thema,
// per call titel/abstract/summary + promptversie). Daardoor geldt:
//   - zelfde invoer  → zelfde score, geen nieuwe AI-aanroep (gratis)
//   - andere invoer  → andere hash, verse analyse
//
// Alle acties zijn best-effort: een cache-fout mag de analyse nooit blokkeren.

import { createHash } from 'node:crypto';
import { fetchWithTimeout } from './llm.js';

const CACHE_TTL_DAYS = 30;
const CACHE_TIMEOUT_MS = 3000;

function cacheConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

function shortHash(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

export function computeCacheKey({ projectIdea = '', keywords = '', selectedTheme = '', calls = [], promptVersion = '' }) {
  const material = JSON.stringify({
    v: promptVersion,
    projectIdea: String(projectIdea),
    keywords: String(keywords),
    theme: String(selectedTheme),
    calls: (calls || []).map((call) => ({
      id: String(call.identifier || ''),
      t: shortHash(call.title || ''),
      s: shortHash(call.summary || ''),
      a: shortHash(call.abstract || '')
    }))
  });
  return createHash('sha256').update(material).digest('hex');
}

/**
 * Leest een cache-entry. Retourneert { payload, provider, model, createdAt } of null.
 * Retourneert altijd null bij configuratie-/netwerkfouten.
 */
export async function readAiCache(inputHash) {
  const config = cacheConfig();
  if (!config || !inputHash) return null;

  try {
    const url = `${config.url}/rest/v1/ai_reviews?input_hash=eq.${encodeURIComponent(inputHash)}` +
      '&select=input_hash,payload,provider,model,created_at';
    const response = await fetchWithTimeout(url, {
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Accept': 'application/json'
      }
    }, CACHE_TIMEOUT_MS);

    if (!response.ok) {
      console.warn('AI-cache read mislukt:', response.status);
      return null;
    }

    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row?.payload?.reviews?.length) return null;

    const ageMs = Date.now() - new Date(row.created_at).getTime();
    if (!Number.isFinite(ageMs) || ageMs > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) return null;

    return {
      payload: row.payload,
      provider: row.provider || null,
      model: row.model || null,
      createdAt: row.created_at
    };
  } catch (err) {
    console.warn('AI-cache read fout:', err.message);
    return null;
  }
}

/** Slaat een analyse-resultaat op. Gooit nooit; retourneert true bij succes. */
export async function writeAiCache(inputHash, payload, { provider = null, model = null, callCount = 0 } = {}) {
  const config = cacheConfig();
  if (!config || !inputHash || !payload?.reviews?.length) return false;

  try {
    const response = await fetchWithTimeout(`${config.url}/rest/v1/ai_reviews`, {
      method: 'POST',
      headers: {
        'apikey': config.key,
        'Authorization': `Bearer ${config.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify({
        input_hash: inputHash,
        payload,
        provider,
        model,
        call_count: callCount
      })
    }, CACHE_TIMEOUT_MS);

    if (!response.ok) {
      console.warn('AI-cache write mislukt:', response.status, await response.text().catch(() => ''));
      return false;
    }
    return true;
  } catch (err) {
    console.warn('AI-cache write fout:', err.message);
    return false;
  }
}
