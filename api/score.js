// api/score.js — Vercel serverless function
// Gebruikt Google Gemini via GEMINI_API_KEY environment variable.
// Ontvangt: POST { projectIdea, keywords, selectedTheme, calls: [...] }
// Geeft terug: { reviews: [...] }

const ALLOWED_ORIGINS = [
  'https://bramschel.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function buildPrompt({ projectIdea, keywords, selectedTheme, calls }) {
  return `
Je bent een EU-fondsenexpert voor Rijkswaterstaat Bureau Brussel.

DOEL:
Beoordeel welke EU-calls het beste passen bij de zoekvraag van de gebruiker en bij de rol van Rijkswaterstaat als uitvoeringsorganisatie voor rijkswegen, vaarwegen, waterbeheer en infrastructuur.

ZOEKVRAAG VAN DE GEBRUIKER:
Projectidee:
${projectIdea || 'Niet opgegeven'}
Keywords:
${keywords || 'Niet opgegeven'}
Gekozen Bureau Brussel-thema:
${selectedTheme || 'Niet opgegeven'}

BUREAU BRUSSEL-THEMA'S:
- Corridor Management
- Climate Adaptation
- Sustainability / Duurzame Leefomgeving
- Digitalisation
- Network Governance

BEOORDELINGSCRITERIA:
Beoordeel per call:
1. Inhoudelijke aansluiting op projectidee en keywords
2. Aansluiting op het gekozen Bureau Brussel-thema, indien opgegeven
3. Relevantie voor Rijkswaterstaat als uitvoeringsorganisatie, niet primair als beleidsmaker
4. Mogelijke rol voor RWS, bijvoorbeeld kennispartner, pilotlocatie, asset owner, beheerder, consortiumdeelnemer of stakeholder
5. Mate van onzekerheid, bijvoorbeeld als scope te breed is of eligibility onduidelijk is

SCORING:
0-20 = niet relevant
21-40 = zwakke match
41-60 = mogelijk relevant
61-80 = relevant
81-100 = sterk relevant

CALLS:
${JSON.stringify(calls, null, 2)}

Geef uitsluitend geldige JSON terug met exact deze structuur:
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
Gebruik geen markdown.
Gebruik geen tekst buiten JSON.
`.trim();
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is niet ingesteld');
    return res.status(500).json({ error: 'Backend niet geconfigureerd' });
  }

  const { projectIdea, keywords, selectedTheme, calls } = req.body || {};

  if (!Array.isArray(calls) || calls.length === 0) {
    return res.status(400).json({ error: 'Geen calls meegestuurd' });
  }

  const batch = calls.slice(0, 15);
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt({ projectIdea, keywords, selectedTheme, calls: batch }) }]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini-fout ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{"reviews":[]}';

    let parsed;
    try {
      parsed = JSON.parse(rawText.trim());
    } catch {
      console.error('Kon Gemini-output niet parsen:', rawText);
      return res.status(502).json({ error: 'AI gaf geen geldige JSON terug' });
    }

    return res.status(200).json({ reviews: parsed.reviews || [] });

  } catch (error) {
    console.error('Fout in /api/score:', error);
    return res.status(500).json({ error: error.message });
  }
}