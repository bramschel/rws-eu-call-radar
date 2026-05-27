// api/score.js — Vercel serverless function
// Roept de Anthropic API aan met ANTHROPIC_API_KEY als environment variable.
// Frontend stuurt een POST met { calls: [...] }, ontvangt { reviews: [...] }.

const ALLOWED_ORIGINS = [
  'https://bramschel.github.io',
  'http://localhost',
  'http://127.0.0.1'
];

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
- Budget: ${c.budget ? `€${c.budget.toLocaleString('nl')}` : 'onbekend'}
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

Reageer UITSLUITEND met de JSON-array. Geen markdown, geen extra tekst, geen uitleg.
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is niet ingesteld als environment variable');
    return res.status(500).json({ error: 'Backend niet geconfigureerd' });
  }

  const { calls } = req.body || {};
  if (!Array.isArray(calls) || calls.length === 0) {
    return res.status(400).json({ error: 'Geen calls meegestuurd' });
  }

  // Begrens tot max 10 calls per aanroep
  const batch = calls.slice(0, 10);

  try {
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildPrompt(batch) }]
      })
    });

    if (!anthropicResponse.ok) {
      const err = await anthropicResponse.json().catch(() => ({}));
      throw new Error(err.error?.message || `Anthropic-fout ${anthropicResponse.status}`);
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = (anthropicData.content?.[0]?.text || '[]').trim();

    let reviews;
    try {
      reviews = JSON.parse(rawText);
    } catch {
      console.error('Kon AI-output niet parsen:', rawText);
      return res.status(502).json({ error: 'AI gaf geen geldige JSON terug' });
    }

    return res.status(200).json({ reviews });

  } catch (error) {
    console.error('Fout in /api/score:', error);
    return res.status(500).json({ error: error.message });
  }
}
