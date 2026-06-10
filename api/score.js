// api/score.js — Vercel serverless function
// Gebruikt Google Gemini via GEMINI_API_KEY environment variable.
// Ontvangt: POST { projectIdea, keywords, selectedTheme, calls: [...] }
// Geeft terug: { reviews: [...] }

const ALLOWED_ORIGINS = [
  'https://bramschel.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();

const MISTRAL_MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';
const MISTRAL_URL   = 'https://api.mistral.ai/v1/chat/completions';

const GEMINI_MODEL  = process.env.GEMINI_MODEL  || 'gemini-2.5-flash-lite';
const GEMINI_URL    = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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

// Relevance examples: laad eenmalig bij cold start
let RELEVANCE_EXAMPLES = [];
try {
  const raw = readFileSync(join(__dirname, '../data/relevance_examples.json'), 'utf8');
  RELEVANCE_EXAMPLES = JSON.parse(raw);
} catch (err) {
  console.warn('relevance_examples.json niet gevonden:', err.message);
}

const RWS_CONTEXT_FALLBACK = `
Rijkswaterstaat is de Nederlandse uitvoeringsorganisatie voor rijkswegen, vaarwegen, waterbeheer, verkeersmanagement en infrastructuur. Beoordeel EU-calls niet op algemene EU-relevantie, maar op concrete relevantie voor RWS als uitvoeringsorganisatie. Een call scoort alleen hoog als er een duidelijke uitvoerings-, beheer-, innovatie-, pilot-, implementatie- of demonstratierol voor RWS mogelijk is.
`.trim();

// Stopwords voor filtering van generieke termen
const STOPWORDS = new Set([
  // Engels
  'the', 'and', 'or', 'for', 'with', 'from', 'into', 'onto', 'of', 'in', 'on', 'at', 'by', 'as', 'to',
  'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'as', 'if', 'then', 'else', 'but',
  // Nederlands
  'de', 'het', 'een', 'en', 'of', 'van', 'voor', 'met', 'in', 'op', 'aan', 'door', 'om', 'te',
  'is', 'zijn', 'wordt', 'worden', 'heeft', 'hebben', 'had', 'hadden', 'kan', 'kunnen',
  'moet', 'moeten', 'zou', 'zouden', 'als', 'dan', 'maar', 'dat', 'wat', 'welke',
  // Generieke project/ call termen
  'relevant', 'relevance', 'project', 'projects', 'call', 'calls', 'european', 'europe',
  'support', 'programme', 'program', 'topic', 'objective', 'expected', 'outcome',
  'outcomes', 'scope', 'aim', 'goal', 'purpose', 'activity', 'activities', 'action',
  'actions', 'measure', 'measures', 'solution', 'solutions', 'approach', 'result',
  'results', 'target', 'targets', 'focus', 'area', 'areas', 'field', 'fields',
  'sector', 'sectors', 'context', 'framework', 'objectives', 'goals',
  // Voeg betekenisvolle acroniemen toe die WEL moeten worden meegenomen
]);

// Betekenisvolle acroniemen die niet gefilterd mogen worden
const MEANINGFUL_ACRONYMS = new Set([
  'its', 'cis', 'ris', 'cef', 'ten', 'tent', 'nwe', 'nsr', 'eu', 'rws', 'brussel',
  'interreg', 'horizon', 'digitas', 'beproact', 'comex', 'epics', 'intercor',
  'twentekanalen', 'zuidasdok', 'krammersluizen', 'maasroute', 'venr',
  'stars4water', 'water4all', 'manabas', 'resiriver', 'immerse', 'bonsai',
  'flashfloodbreaker', 'collibri', 'r4im', 'remac', 'merlin', 'napsea',
  'citytex', 'circular', 'digitrans', 'sustainability', 'climate'
]);

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

function normalizeText(text) {
  return String(text || '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function isMeaningfulTerm(term) {
  // Acroniemen van 3-4 letters die in MEANINGFUL_ACRONYMS zitten mogen door
  if (MEANINGFUL_ACRONYMS.has(term)) {
    return true;
  }
  // Alfanumerieke termen van 4+ karakters mogen door
  if (term.length >= 4) {
    return true;
  }
  // Acroniemen van 3 letters die beginnend met hoofdletter (bv. ITS, CEF) mogen door
  if (term.length === 3 && /^[A-Z]{3}$/.test(term)) {
    return true;
  }
  return false;
}

function splitTerms(value) {
  return normalizeText(value)
    .split(/[\s,;]+/)
    .map((term) => term.trim())
    .filter((term) => {
      if (!term) return false;
      // Filter stopwords
      if (STOPWORDS.has(term)) return false;
      // Filter op betekenisvolle lengte/acroniemen
      return isMeaningfulTerm(term);
    });
}

function scoreRelevanceExample(example, projectIdea, keywords, selectedTheme, calls) {
  let score = 0;
  const matchedKeywords = [];

  // Bonus voor hetzelfde themeId als selectedTheme
  if (example.themeId === selectedTheme) {
    score += 30;
  }

  // Keyword overlap met example.keywords (hoogste gewicht: 15 per match)
  const userKeywords = new Set([...splitTerms(keywords), ...splitTerms(projectIdea)]);
  const exampleKeywords = new Set(example.keywords?.map(normalizeText) || []);
  
  let keywordMatches = 0;
  for (const kw of userKeywords) {
    if (exampleKeywords.has(kw)) {
      score += 15;
      keywordMatches++;
      if (!matchedKeywords.includes(kw)) {
        matchedKeywords.push(kw);
      }
    }
  }

  // Overlap met projectName en call (middelgewicht: 10 per match)
  const exampleNameAndCall = normalizeText([example.projectName, example.call].join(' '));
  for (const term of userKeywords) {
    if (exampleNameAndCall.includes(` ${term} `) || exampleNameAndCall.startsWith(`${term} `) || exampleNameAndCall.endsWith(` ${term}`)) {
      score += 10;
      if (!matchedKeywords.includes(term)) {
        matchedKeywords.push(term);
      }
    }
  }

  // Overlap met pattern en lesson (laag gewicht: 5 per match)
  const examplePatternAndLesson = normalizeText([example.pattern, example.lesson].join(' '));
  for (const term of userKeywords) {
    if (examplePatternAndLesson.includes(` ${term} `) || examplePatternAndLesson.startsWith(`${term} `) || examplePatternAndLesson.endsWith(` ${term}`)) {
      score += 5;
      if (!matchedKeywords.includes(term)) {
        matchedKeywords.push(term);
      }
    }
  }

  // Overlap met call titels/summaries/abstracts (bonus: 8 per match)
  for (const call of calls) {
    const callText = normalizeText([call.title, call.summary, call.destination, call.abstract].join(' '));
    const exampleText = normalizeText([example.projectName, example.call, example.pattern].join(' '));
    
    const callTerms = splitTerms(callText);
    const exampleTerms = splitTerms(exampleText);
    
    for (const ct of callTerms) {
      for (const et of exampleTerms) {
        if (ct === et) {
          score += 8;
          if (!matchedKeywords.includes(ct)) {
            matchedKeywords.push(ct);
          }
        }
      }
    }
  }

  // Bonus als useAs is positive_example
  if (example.useAs === 'positive_example') {
    score += 10;
  }

  return { score, matchedKeywords, keywordMatches };
}

function selectRelevanceExamples(projectIdea, keywords, selectedTheme, calls) {
  if (RELEVANCE_EXAMPLES.length === 0) {
    return { examples: [], metadata: [] };
  }

  const scoredExamples = RELEVANCE_EXAMPLES.map((example) => {
    return {
      ...example,
      ...scoreRelevanceExample(example, projectIdea, keywords, selectedTheme, calls)
    };
  });

  // Sorteer op score (hoog naar laag)
  scoredExamples.sort((a, b) => b.score - a.score);

  // Selecteer examples: prioriteer hetzelfde thema, cross-theme alleen bij sterke match
  const sameThemeExamples = scoredExamples.filter((ex) => ex.themeId === selectedTheme);
  const otherThemeExamples = scoredExamples.filter((ex) => ex.themeId !== selectedTheme);

  const selected = [];
  const seenIds = new Set();

  // Eerst: selecteer uit hetzelfde thema (max 5)
  for (const ex of sameThemeExamples) {
    if (seenIds.size >= 5) break;
    if (!seenIds.has(ex.id)) {
      seenIds.add(ex.id);
      selected.push(ex);
    }
  }

  // Als we nog ruimte hebben: vul aan met cross-theme examples die minimaal 2 keyword matches hebben
  if (seenIds.size < 5) {
    const strongCrossTheme = otherThemeExamples.filter((ex) => ex.keywordMatches >= 2);
    // Sorteer op score
    strongCrossTheme.sort((a, b) => b.score - a.score);
    
    for (const ex of strongCrossTheme) {
      if (seenIds.size >= 5) break;
      if (!seenIds.has(ex.id)) {
        seenIds.add(ex.id);
        selected.push(ex);
      }
    }
  }

  // Als we nog steeds niet genoeg hebben: neem beste cross-theme regardless
  if (seenIds.size < 5) {
    otherThemeExamples.sort((a, b) => b.score - a.score);
    for (const ex of otherThemeExamples) {
      if (seenIds.size >= 5) break;
      if (!seenIds.has(ex.id)) {
        seenIds.add(ex.id);
        selected.push(ex);
      }
    }
  }

  return {
    examples: selected,
    metadata: selected.map((ex) => ({
      id: ex.id,
      projectName: ex.projectName,
      call: ex.call,
      theme: ex.theme,
      themeId: ex.themeId,
      outcome: ex.outcome,
      matchedKeywords: ex.matchedKeywords
    }))
  };
}

function buildPrompt({ projectIdea, keywords, selectedTheme, calls }) {
  const rwsContext = buildRwsContext(selectedTheme) || RWS_CONTEXT_FALLBACK;
  const { examples } = selectRelevanceExamples(projectIdea, keywords, selectedTheme, calls);
  
  const relevanceExamplesText = examples.length > 0
    ? `\nRELEVANTE HISTORISCHE VOORBEELDEN:\n` + examples.map((ex) => `
## Voorbeeld: ${ex.projectName}\nThema: ${ex.theme} (${ex.themeId})\nCall: ${ex.call}\nKeywords: ${ex.keywords?.join(', ') || 'Niet beschikbaar'}\nPatroon: ${ex.pattern || 'Niet beschikbaar'}\nRWS-rol: ${ex.rwsRole || 'Niet beschikbaar'}\n`).join('\n')
    : '';

  return `
Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel.

RELEVANTE RWS- EN BUREAU BRUSSEL-RAG-CONTEXT:
${rwsContext}${relevanceExamplesText}

Gebruik deze context als beoordelingskader. Beoordeel calls niet op algemene EU-relevantie, maar op concrete RWS-relevantie, uitvoerbaarheid en toepasbaarheid voor Rijkswaterstaat als uitvoeringsorganisatie.

IMPORTANT: De historische voorbeelden mogen alleen zwaar meewegen als de nieuwe call inhoudelijk lijkt op titel, scope, doel, keywords of RWS-rol van het historische voorbeeld. Gebruik historische voorbeelden om patronen te herkennen, niet om blind te kopiëren. Een nieuwe call moet zelfstandig beoordeeld blijven op projectfit, RWS-fit en themafit. De outcome uit historische voorbeelden (zoals rejected_eu of rejected_rws) is ALLEEN procesinformatie en mag de relevantie NOOIT verlagen. Als een call sterk lijkt op een voorbeeld, benoem dat dan expliciet in projectFit of rationale.

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

MANAGEMENT SAMENVATTING OPDRACHT:
Naast de individuele call-beoordelingen, lever ook een beknopte managementsamenvatting voor de top 10 resultaten. 
Deze samenvatting is bedoeld voor RWS-management en moet de volgende elementen bevatten:

Geefitsluitend geldige JSON terug.
Geen markdown.
Geen code fences.
Geen uitleg buiten JSON.

De JSON moet exact deze structuur hebben:
{
  "summary": {
    "executiveSummary": "Beknopte samenvatting in 2-3 zinnen van de belangrijkste bevindingen voor RWS",
    "overallAdvice": "Algemene advies in 1-2 zinnen over de kansen en uitdagingen",
    "topOpportunities": [
      {"identifier": "...", "title": "...", "score": 0, "rationale": "..."},
      {"identifier": "...", "title": "...", "score": 0, "rationale": "..."},
      {"identifier": "...", "title": "...", "score": 0, "rationale": "..."}
    ],
    "notableExclusions": "Belangrijke calls die NIET in de top 10 zitten maar wel relevant kunnen zijn voor RWS (max 2-3 regels)",
    "recommendedNextSteps": [
      "Concrete aanbeveling 1",
      "Concrete aanbeveling 2",
      "Concrete aanbeveling 3"
    ]
  },
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
- projectFit: beschrijf in 1-2 zinnen hoe de call aansluit op het concrete projectidee van de gebruiker. Benem expliciet als de call lijkt op historische voorbeelden.
- projectFitScore: score 0-100 voor aansluiting op het projectidee, los van algemene RWS-relevantie.
- rationale: beschrijf de totale beoordeling, inclusief RWS-fit en EU-call fit. Vermeld als historische patronen herkend zijn.
- summary.executiveSummary: management samenvatting van de top resultaten
- summary.topOpportunities: top 3 meest relevante calls met korte toelichting
- summary.notableExclusions: importante calls die net buiten de top 10 vallen
- summary.recommendedNextSteps: 3 concrete actiepunten voor RWS

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

function extractSummaryFromData(parsed) {
  // Extract summary from various possible locations
  if (parsed?.summary) {
    return parsed.summary;
  }

  // If summary is at root level
  if (parsed.executiveSummary || parsed.overallAdvice) {
    return parsed;
  }

  // If reviews contains summary
  const reviewsArray = Array.isArray(parsed?.reviews) ? parsed.reviews : [];
  const firstReview = reviewsArray[0];
  if (firstReview?.summary) {
    return firstReview.summary;
  }

  return null;
}

function normalizeAiReviews(parsed) {
  const reviews = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.reviews)
      ? parsed.reviews
      : [];

  const normalized = reviews.map((review) => ({
    identifier: review.identifier || review.callId || '',
    aiRelevanceScore: Number(review.aiRelevanceScore ?? 0),
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
  }));

  // Sorteer reviews op aiRelevanceScore (hoog naar laag)
  // Calls zonder score (0) komen onderaan
  normalized.sort((a, b) => {
    const scoreA = a.aiRelevanceScore || 0;
    const scoreB = b.aiRelevanceScore || 0;
    return scoreB - scoreA;
  });

  return { reviews: normalized };
}

// ── Provider-specifieke LLM-aanroepen ────────────────────────

async function callMistral(prompt) {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY is niet ingesteld');

  const response = await fetch(MISTRAL_URL, {
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
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Mistral-fout ${response.status}`);
  }

  const data = await response.json();
  return {
    rawText: data.choices?.[0]?.message?.content || '{"reviews":[],"summary":{}}',
    provider: 'mistral',
    model: MISTRAL_MODEL
  };
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is niet ingesteld');

  const url = `${GEMINI_URL}?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{
          text: 'Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel. Geef uitsluitend geldige JSON terug. Geen markdown, geen code fences, geen tekst buiten JSON.'
        }]
      },
      contents: [{
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err.error?.message || `Gemini-fout ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();

  // Haal tekst op uit candidates[0].content.parts (kan meerdere parts zijn)
  const parts = data.candidates?.[0]?.content?.parts || [];
  const rawText = parts.map(p => p.text || '').join('') || '{"reviews":[],"summary":{}}';

  return {
    rawText,
    provider: 'gemini',
    model: GEMINI_MODEL
  };
}

// ── Handler ───────────────────────────────────────────────────

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { projectIdea, keywords, selectedTheme, calls } = req.body || {};

    if (!Array.isArray(calls) || calls.length === 0) {
      return res.status(400).json({ error: 'Geen calls meegestuurd' });
    }

    const batch = calls.slice(0, 10);

    // Selecteer relevante historische voorbeelden
    const { metadata: relevanceExamplesUsed } = selectRelevanceExamples(
      projectIdea,
      keywords,
      selectedTheme,
      batch
    );

    const prompt = buildPrompt({ projectIdea, keywords, selectedTheme, calls: batch });

// Dispatch naar de geconfigureerde provider
let rawText, provider, model;

if (AI_PROVIDER === 'gemini') {
  ({ rawText, provider, model } = await callGemini(prompt));
} else if (AI_PROVIDER === 'mistral') {
  ({ rawText, provider, model } = await callMistral(prompt));
} else {
  throw new Error(`Onbekende AI_PROVIDER: ${AI_PROVIDER}`);
}

    let parsed;
    try {
      parsed = extractJsonFromText(rawText);
    } catch (parseError) {
      console.error(`Kon ${provider}-output niet parsen:`, rawText);
      return res.status(502).json({ error: 'AI gaf geen geldige JSON terug', rawText });
    }

    const normalized     = normalizeAiReviews(parsed);
    const summary        = extractSummaryFromData(parsed);
    const responseSummary = summary || {
      executiveSummary: '',
      overallAdvice: '',
      topOpportunities: [],
      notableExclusions: '',
      recommendedNextSteps: []
    };

    // ragContextUsed hoort niet in summary-output
    delete responseSummary.ragContextUsed;

    const ragContext = getRagContextMetadata(selectedTheme);

    return res.status(200).json({
      ...normalized,
      summary: responseSummary,
      provider,
      model,
      ragContextUsed: ragContext,
      relevanceExamplesUsed
    });

  } catch (error) {
    console.error('Fout in /api/score:', error);
    return res.status(500).json({ error: error.message });
  }
}