// api/score.js — Vercel serverless function
// Gebruikt Google Gemini via GEMINI_API_KEY environment variable.
// Ontvangt: POST { projectIdea, keywords, selectedTheme, calls: [...] }
// Geeft terug: { reviews: [...] }

const ALLOWED_ORIGINS = [
  'https://bramschel.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));

  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// RAG-context: laad eenmalig bij cold start
let RAG_CONTEXT = [];
try {
  const raw = readFileSync(join(__dirname, '../data/rws_rag_context.json'), 'utf8');
  RAG_CONTEXT = JSON.parse(raw);
} catch (err) {
  console.warn('rws_rag_context.json niet gevonden, RAG uitgeschakeld:', err.message);
}

const RWS_CONTEXT_FALLBACK = `
Rijkswaterstaat is de Nederlandse uitvoeringsorganisatie voor rijkswegen, vaarwegen, waterbeheer, verkeersmanagement en infrastructuur. Beoordeel EU-calls niet op algemene EU-relevantie, maar op concrete relevantie voor RWS als uitvoeringsorganisatie. Een call scoort alleen hoog als er een duidelijke uitvoerings-, beheer-, innovatie-, pilot-, implementatie- of demonstratierol voor RWS mogelijk is.
`.trim();

function selectRagEntries(selectedTheme) {
  const theme = selectedTheme || 'all';
  const entries = RAG_CONTEXT.filter((entry) => {
    const themes = entry.themes || [];
    if (themes.includes('all')) return true;
    if (theme !== 'all' && themes.includes(theme)) return true;
    if (theme === 'all' && String(entry.id || '').startsWith('rws-')) return true;
    return false;
  });
  return entries.slice(0, 8);
}

function buildRwsContext(selectedTheme) {
  const entries = selectRagEntries(selectedTheme);
  return entries
    .map((entry) => `## ${entry.title}\nBron: ${entry.source}\n${entry.text}`)
    .join('\n\n');
}

function getRagContextMetadata(selectedTheme) {
  return selectRagEntries(selectedTheme).map((entry) => ({
    id: entry.id,
    title: entry.title,
    source: entry.source,
    themes: entry.themes || []
  }));
}

function buildPrompt({ projectIdea, keywords, selectedTheme, calls }) {
  const rwsContext = buildRwsContext(selectedTheme) || RWS_CONTEXT_FALLBACK;

  return `
Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel.

RELEVANTE RWS- EN BUREAU BRUSSEL-RAG-CONTEXT:
${rwsContext}

Gebruik deze context als beoordelingskader. Beoordeel calls niet op algemene EU-relevantie, maar op concrete RWS-relevantie, uitvoerbaarheid en toepasbaarheid voor Rijkswaterstaat als uitvoeringsorganisatie.

ZOEKVRAAG VAN DE GEBRUIKER:
Projectidee:
${projectIdea || 'Niet opgegeven'}

Keywords:
${keywords || 'Niet opgegeven'}

Gekozen Bureau Brussel-thema:
${selectedTheme || 'Niet opgegeven'}

OPDRACHT:
Beoordeel de onderstaande EU-calls specifiek ten opzichte van de zoekvraag van de gebruiker.

De zoekvraag van de gebruiker is leidend. Leg per call expliciet uit:
1. of en hoe de call aansluit op het projectidee;
2. welke onderdelen van het projectidee terugkomen in de call;
3. welke onderdelen ontbreken of onzeker zijn;
4. of Rijkswaterstaat een logische rol kan hebben als uitvoeringsorganisatie;
5. hoe de call past binnen het gekozen Bureau Brussel-thema.

Als het projectidee Nederlandstalige RWS-termen bevat, interpreteer deze in EU-call context. Bijvoorbeeld:
- bruggenmonitoring = bridge monitoring, bridge inspection, structural health monitoring, condition monitoring;
- hoofdwegennet = highway network, national road network, motorway network, road infrastructure;
- instandhouding = maintenance, renovation, replacement, lifecycle management, asset management;
- kunstwerken = bridges, tunnels, locks, sluices, civil structures.

Geef een hoge score alleen als de call zowel inhoudelijk aansluit op het projectidee als een duidelijke RWS-rol heeft.

Rangschik de calls van meest naar minst relevant.

BEOORDELINGSCRITERIA:
Beoordeel per call:
1. Inhoudelijke aansluiting op projectidee en keywords.
2. Aansluiting op het gekozen Bureau Brussel-thema, indien opgegeven.
3. Relevantie voor Rijkswaterstaat als uitvoeringsorganisatie, niet primair als beleidsmaker.
4. Mogelijke rol voor RWS, bijvoorbeeld kennispartner, pilotlocatie, asset owner, beheerder, consortiumdeelnemer of stakeholder.
5. Mate van onzekerheid, bijvoorbeeld als scope te breed is of eligibility onduidelijk is.


SCORING:
Beoordeel streng. Een call is alleen hoog relevant als er zowel projectfit als RWS-fit is.

0-20 = niet relevant voor RWS
21-40 = zwakke RWS-fit of vooral buiten RWS-domein
41-60 = mogelijk relevant, maar RWS-rol is onzeker of indirect
61-80 = relevant, duidelijke link met RWS-domeinen en mogelijke RWS-rol
81-100 = sterk relevant, duidelijke projectfit, duidelijke RWS-rol en passend Bureau Brussel-thema

Scorebeperkingen:
- Primair landbouw/boeren/voedsel/gewassen/veeteelt zonder RWS-waterbeheer of infrastructuurcomponent: maximaal 35.
- Primair gemeentelijk/stedelijk zonder rol voor nationale infrastructuur, waterbeheer of corridors: maximaal 45.
- Puur academisch of individuele onderzoeker zonder implementatie/pilot/asset owner rol: maximaal 40.
- Algemene klimaatadaptatie zonder RWS-specifieke toepassing: maximaal 45.

CALLS:
${JSON.stringify(calls, null, 2)}

Geef uitsluitend geldige JSON terug.
Geen markdown.
Geen code fences.
Geen uitleg buiten JSON.

De JSON moet exact deze structuur hebben:
{
  "reviews": [
    {
      "identifier": "...",
      "aiRelevanceScore": 0,
      "projectFit": "...",
      "projectFitScore": 0,
      "themeFit": ["..."],
      "rationale": "...",
      "possibleRwsRole": "...",
      "uncertainties": "...",
      "recommendedNextStep": "..."
    }
  ]
}

Veldinstructies:
- projectFit: beschrijf in 1-2 zinnen hoe de call aansluit op het concrete projectidee van de gebruiker.
- projectFitScore: score 0-100 voor aansluiting op het projectidee, los van algemene RWS-relevantie.
- rationale: beschrijf de totale beoordeling, inclusief RWS-fit en EU-call fit. 

Sorteer reviews van hoogste naar laagste aiRelevanceScore.
Gebruik geen tekst buiten JSON.
`.trim();
}

function extractJsonFromText(text) {
  const cleaned = String(text || '')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Ga door naar extractie hieronder.
  }

  const firstObject = cleaned.indexOf('{');
  const lastObject = cleaned.lastIndexOf('}');
  const firstArray = cleaned.indexOf('[');
  const lastArray = cleaned.lastIndexOf(']');

  const objectCandidate =
    firstObject !== -1 && lastObject !== -1 && lastObject > firstObject
      ? cleaned.slice(firstObject, lastObject + 1)
      : '';

  const arrayCandidate =
    firstArray !== -1 && lastArray !== -1 && lastArray > firstArray
      ? cleaned.slice(firstArray, lastArray + 1)
      : '';

  const candidates = [objectCandidate, arrayCandidate].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Probeer volgende kandidaat.
    }
  }

  throw new Error('AI gaf geen geldige JSON terug');
}

function normalizeAiReviews(parsed) {
  const reviews = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.reviews)
      ? parsed.reviews
      : [];

  return {
  reviews: reviews.map((review) => ({
    identifier: review.identifier || review.callId || '',
    aiRelevanceScore: Number(
      review.aiRelevanceScore ??
      review.score ??
      review.relevanceScore ??
      0
    ),
    projectFit: review.projectFit || review.project_fit || review.projectMatch || '',
    projectFitScore: Number(
      review.projectFitScore ??
      review.project_fit_score ??
      review.projectMatchScore ??
      0
    ),
    themeFit: Array.isArray(review.themeFit)
      ? review.themeFit
      : review.themeFit
        ? [review.themeFit]
        : review.theme
          ? [review.theme]
          : review.thema
            ? [review.thema]
            : [],
    rationale: review.rationale || review.uitleg || review.explanation || '',
    possibleRwsRole: review.possibleRwsRole || review.rws_role || review.rwsRole || '',
    uncertainties: review.uncertainties || review.onzekerheden || '',
    recommendedNextStep: review.recommendedNextStep || review.next_step || review.nextStep || ''
  }))
};
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      console.error('MISTRAL_API_KEY is niet ingesteld');
      return res.status(500).json({ error: 'Backend niet geconfigureerd' });
    }

    const { projectIdea, keywords, selectedTheme, calls } = req.body || {};

    if (!Array.isArray(calls) || calls.length === 0) {
      return res.status(400).json({ error: 'Geen calls meegestuurd' });
    }

    const batch = calls.slice(0, 10);

    const prompt = buildPrompt({
      projectIdea,
      keywords,
      selectedTheme,
      calls: batch
    });

    const mistralResponse = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel. Geef uitsluitend geldige JSON terug.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!mistralResponse.ok) {
      const err = await mistralResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || `Mistral-fout ${mistralResponse.status}`);
    }

    const mistralData = await mistralResponse.json();
    const rawText = mistralData.choices?.[0]?.message?.content || '{"reviews":[]}';

    let parsed;

    try {
      parsed = extractJsonFromText(rawText);
    } catch (parseError) {
      console.error('Kon Mistral-output niet parsen:', rawText);

      return res.status(502).json({
        error: 'AI gaf geen geldige JSON terug',
        rawText
      });
    }

    const normalized = normalizeAiReviews(parsed);

return res.status(200).json({
  ...normalized,
  provider: 'mistral',
  model: MISTRAL_MODEL,
  ragContextUsed: getRagContextMetadata(selectedTheme)
});
  } catch (error) {
    console.error('Fout in /api/score:', error);
    return res.status(500).json({ error: error.message });
  }
}