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

const RWS_CONTEXT = `
Rijkswaterstaat (RWS) beheert en ontwikkelt nationale infrastructuur voor wegen, vaarwegen, waterbeheer en verkeersmanagement. RWS is vooral relevant voor EU-calls wanneer er een duidelijke uitvoerings-, beheer-, innovatie-, pilot- of implementatierol mogelijk is.

Concrete RWS-aansluitingen bij EU-calls kunnen zijn:
- klimaatbestendige infrastructuur en waterwerken;
- digitale infrastructuur, digital twins, sensoren, data en decision support;
- energietransitie en verduurzaming van infrastructuur;
- circulair materiaalgebruik, hergebruik van asfalt, biobased materialen en duurzaam onderhoud;
- waterveiligheid, sedimenttransport, vaarwegen, rivieren en kustsystemen;
- TEN-T corridors, CEF Transport, corridorbeheer, logistiek en binnenvaart;
- grensoverschrijdend waterbeheer met buurlanden;
- internationale kennisuitwisseling rond wegen, vaarwegen, havens en waterbeheer.

Bureau Brussel gebruikt vijf thema's:
1. Corridor Management
2. Climate Adaptation
3. Sustainability / Duurzame Leefomgeving
4. Digitalisation
5. Network Governance

Een call scoort hoog als:
- RWS logisch kan deelnemen als beheerder, asset owner, pilotlocatie, living lab, kennispartner, dataleverancier, implementatiepartner of consortiumdeelnemer;
- de call toepasbaar is op infrastructuur, waterbeheer, wegen, vaarwegen, verkeersmanagement, assetmanagement of duurzame leefomgeving;
- de call ruimte biedt voor demonstratie, implementatie, governance, datadeling of praktijkgerichte innovatie.

Een call scoort lager als:
- de call primair gericht is op beleidsvorming of wetgeving zonder duidelijke uitvoeringscomponent;
- de call vooral bedoeld is voor individuele onderzoekers, steden/gemeenten zonder RWS-rol, MKB-leadpartners, defensie zonder civiele of dual-use infrastructuur-link, of thema's zonder infrastructuur-, water- of netwerkcomponent.
`.trim();

function buildPrompt({ projectIdea, keywords, selectedTheme, calls }) {
  return `
Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel.

RWS-CONTEXT:
${RWS_CONTEXT}

ZOEKVRAAG VAN DE GEBRUIKER:
Projectidee:
${projectIdea || 'Niet opgegeven'}

Keywords:
${keywords || 'Niet opgegeven'}

Gekozen Bureau Brussel-thema:
${selectedTheme || 'Niet opgegeven'}

OPDRACHT:
Beoordeel de onderstaande EU-calls specifiek op hoe goed ze aansluiten bij:
1. de zoekvraag van de gebruiker;
2. de rol van Rijkswaterstaat als uitvoeringsorganisatie;
3. het gekozen Bureau Brussel-thema, indien opgegeven.

Rangschik de calls van meest naar minst relevant.

BEOORDELINGSCRITERIA:
Beoordeel per call:
1. Inhoudelijke aansluiting op projectidee en keywords.
2. Aansluiting op het gekozen Bureau Brussel-thema, indien opgegeven.
3. Relevantie voor Rijkswaterstaat als uitvoeringsorganisatie, niet primair als beleidsmaker.
4. Mogelijke rol voor RWS, bijvoorbeeld kennispartner, pilotlocatie, asset owner, beheerder, consortiumdeelnemer of stakeholder.
5. Mate van onzekerheid, bijvoorbeeld als scope te breed is of eligibility onduidelijk is.

SCORING:
0-20 = niet relevant
21-40 = zwakke match
41-60 = mogelijk relevant
61-80 = relevant
81-100 = sterk relevant

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
      "themeFit": ["..."],
      "rationale": "...",
      "possibleRwsRole": "...",
      "uncertainties": "...",
      "recommendedNextStep": "..."
    }
  ]
}

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

    return res.status(200).json(normalized);
  } catch (error) {
    console.error('Fout in /api/score:', error);
    return res.status(500).json({ error: error.message });
  }
}