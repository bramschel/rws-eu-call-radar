// api/score.js — Vercel serverless function
// Gebruikt Google Gemini Flash (gratis tier) via GEMINI_API_KEY environment variable.
// Frontend stuurt POST { calls: [...] }, ontvangt { reviews: [...] }.

const ALLOWED_ORIGINS = [
  'https://bramschel.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

const RWS_CONTEXT = `
Rijkswaterstaat (RWS) is de Nederlandse uitvoeringsorganisatie voor rijkswegen, vaarwegen,
zeehavens en waterbeheer, onder het ministerie van Infrastructuur en Waterstaat.
RWS beheert en innoveert fysieke infrastructuur — het is geen beleidsmaker maar een
uitvoerder en opdrachtgever. Kernthema's: klimaatadaptatie en waterveiligheid,
digitalisering van infrastructuur (digital twins, data, ITS), circulaire en duurzame
leefomgeving, corridorbeheer en TEN-T, en network governance (internationale samenwerking
met wegbeheerders en waterbeheerders). RWS is geschikt als projectpartner, als data- of
kennisleverancier, of als living lab voor pilots op rijksinfrastructuur.
`.trim();

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function buildPrompt(calls) {
  const callsList = calls
    .map(
      (c, i) => `
Call ${i + 1}:
- Identifier: ${c.identifier}
- Titel: ${c.title}
- Programma: ${c.programme}
- Samenvatting: ${c.summary || '(niet beschikbaar)'}
- Abstract: ${c.abstract || '(niet beschikbaar)'}
- Actie-type: ${c.actionType || '(niet beschikbaar)'}
- Budget: ${c.budget ? `€${Number(c.budget).toLocaleString('nl')}` : 'onbekend'}
- Deadline: ${c.deadline || 'onbekend'}
`.trim()
    )
    .join('\n\n');

  return `
Je bent een EU-fondsenexpert voor Rijkswaterstaat. Beoordeel elke call hieronder op
relevantie voor RWS als uitvoeringsorganisatie.

Context over RWS:
${RWS_CONTEXT}

Kies voor het veld "theme" uit deze opties (kies de beste match, anders "Geen"):
- Corridor Management
- Climate Adaptation
- Sustainability / Duurzame Leefomgeving
- Digitalisation
- Network Governance
- Geen

Calls om te beoordelen:
${callsList}

Geef voor elke call een JSON-object. Geef het totale resultaat als een JSON-array.
Elk object heeft exact deze velden:
{
  "identifier": "<call identifier>",
  "score": <0-100>,
  "rationale": "<2-3 zinnen: waarom wel of niet relevant voor RWS>",
  "rws_role": "<welke rol RWS kan spelen: partner, kennisleverancier, living lab, opdrachtgever, etc.>",
  "uncertainties": "<eventuele twijfels of risico's bij deelname>",
  "next_step": "<concreet advies voor Bureau Brussel: nader onderzoeken, thematrekker aanschrijven, etc.>",
  "theme": "<gekozen thema>"
}

Reageer UITSLUITEND met de JSON-array. Geen markdown, geen uitleg, geen backticks.
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
    console.error('GEMINI_API_KEY is niet ingesteld als environment variable');
    return res.status(500).json({ error: 'Backend niet geconfigureerd' });
  }

  const { calls } = req.body || {};
  if (!Array.isArray(calls) || calls.length === 0) {
    return res.status(400).json({ error: 'Geen calls meegestuurd' });
  }

  // Begrens tot max 10 calls per aanroep
  const batch = calls.slice(0, 10);

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(batch) }]
          }
        ],
        generationConfig: {
          temperature: 0.2,       // laag = consistente, feitelijke output
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'  // dwingt Gemini tot pure JSON-output
        }
      })
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini-fout ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

    let reviews;
    try {
      reviews = JSON.parse(rawText.trim());
    } catch {
      console.error('Kon Gemini-output niet parsen:', rawText);
      return res.status(502).json({ error: 'AI gaf geen geldige JSON terug' });
    }

    return res.status(200).json({ reviews });

  } catch (error) {
    console.error('Fout in /api/score:', error);
    return res.status(500).json({ error: error.message });
  }
}